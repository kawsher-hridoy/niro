"""
Niro — gpt-5.3-chat capability probe (Azure OpenAI).

Reads key from env: AZURE_OPENAI_KEY
Reproducible. Does NOT persist key to disk.
"""
import os, sys, json, base64, time, traceback
from openai import OpenAI

KEY = os.environ.get("AZURE_OPENAI_KEY")
if not KEY:
    sys.exit("Set AZURE_OPENAI_KEY env var.")

ENDPOINT = "https://ai-for-security.services.ai.azure.com/openai/v1"
DEPLOYMENT = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-5.3-chat")

client = OpenAI(base_url=ENDPOINT, api_key=KEY)

RESULTS = []

def section(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)

def b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()

def record(name, ok, note, sample=None):
    RESULTS.append({"test": name, "ok": ok, "note": note, "sample": sample})
    print(f"\n[{'PASS' if ok else 'FAIL'}] {name} — {note}")

def call(messages, tools=None, response_format=None, timeout=60):
    kw = dict(model=DEPLOYMENT, messages=messages, timeout=timeout)
    if tools is not None:
        kw["tools"] = tools
    if response_format is not None:
        kw["response_format"] = response_format
    return client.chat.completions.create(**kw)


# ------------------------- TEST 1: Bangla -------------------------
section("TEST 1 — Bangla generation quality")
try:
    r = call([
        {"role": "system", "content":
         "You are a friendly health educator. Always answer in clear, simple, conversational Bangla. Do not use English words unless the term has no Bangla equivalent."},
        {"role": "user", "content":
         "একজন রোগীকে বলো hemoglobin মানে কী এবং কম হলে কী সমস্যা হয়। ৩-৪ লাইনে।"}
    ])
    txt = r.choices[0].message.content or ""
    print(txt)
    bn = sum(1 for c in txt if "ঀ" <= c <= "৿")
    pct = (bn / max(1, len(txt))) * 100
    ok = pct > 40 and len(txt) > 50
    record("bangla_generation", ok, f"{pct:.0f}% Bangla characters, {len(txt)} chars", txt[:200])
except Exception as e:
    record("bangla_generation", False, f"exception: {e}")
    traceback.print_exc()


# ------------------------- TEST 2: Structured JSON -------------------------
section("TEST 2 — Structured JSON from prescription text")
try:
    r = call([
        {"role": "system", "content":
         "Extract medications from a doctor's prescription. Return strict JSON with key 'medications' as a list of {name, strength, dosage, frequency, duration, notes}."},
        {"role": "user", "content":
         "Rx:\n1. Tab. Metformin 500 mg — 1+0+1 after meal — 30 days\n"
         "2. Tab. Glimepiride 2 mg — 1+0+0 before breakfast — 30 days\n"
         "3. Tab. Losartan 50 mg — 1+0+0 morning — 30 days\n"
         "4. Tab. Atorvastatin 10 mg — 0+0+1 at night — 30 days\n"
         "5. Cap. Sergel 20 mg — 1+0+1 before meal — 14 days\n"
         "6. Tab. Napa 500 mg — SOS if pain"}
    ], response_format={"type": "json_object"})
    txt = r.choices[0].message.content or "{}"
    print(txt)
    data = json.loads(txt)
    meds = data.get("medications", [])
    ok = len(meds) >= 5 and all("name" in m for m in meds)
    record("structured_json", ok, f"{len(meds)} medications extracted", txt[:300])
except Exception as e:
    record("structured_json", False, f"exception: {e}")
    traceback.print_exc()


# ------------------------- TEST 3: Vision on prescription -------------------------
section("TEST 3 — Vision: read prescription image (PNG)")
try:
    img = b64("sample_rx.png")
    r = call([
        {"role": "user", "content": [
            {"type": "text", "text":
             "This is a doctor's prescription image. Extract the medications as JSON: "
             "{ \"patient\": ..., \"diagnosis\": ..., \"medications\": [{name, strength, dosage, frequency, duration}] }. "
             "Return JSON only."},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img}"}}
        ]}
    ], response_format={"type": "json_object"})
    txt = r.choices[0].message.content or "{}"
    print(txt[:1500])
    data = json.loads(txt)
    meds = data.get("medications", []) or []
    has_metformin = any("metformin" in (m.get("name") or "").lower() for m in meds)
    ok = len(meds) >= 4 and has_metformin
    record("vision_prescription", ok, f"{len(meds)} medications read; metformin detected: {has_metformin}", txt[:400])
except Exception as e:
    record("vision_prescription", False, f"exception: {e}")
    traceback.print_exc()


# ------------------------- TEST 4: Vision on lab report + Bangla explanation -------------------------
section("TEST 4 — Vision + Bangla: explain lab report (content filter check)")
try:
    img = b64("sample_lab.png")
    r = call([
        {"role": "system", "content":
         "You are a patient-friendly health educator for Bangladeshi patients. "
         "Look at the lab report and explain the results in simple Bangla. "
         "Highlight which values are abnormal and what the patient should ask the doctor. "
         "Do NOT give a final diagnosis or change medications — only explain."},
        {"role": "user", "content": [
            {"type": "text", "text": "এই রিপোর্টটি বুঝিয়ে দাও।"},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img}"}}
        ]}
    ])
    txt = r.choices[0].message.content or ""
    print(txt)
    bn = sum(1 for c in txt if "ঀ" <= c <= "৿")
    pct = (bn / max(1, len(txt))) * 100
    mentions_anomaly = any(k in txt.lower() for k in ["hba1c", "ldl", "hemoglobin", "8.2", "168", "245"])
    ok = pct > 30 and mentions_anomaly and len(txt) > 200
    record("vision_lab_bangla", ok,
           f"{pct:.0f}% Bangla, mentions anomalies: {mentions_anomaly}, {len(txt)} chars",
           txt[:400])
except Exception as e:
    record("vision_lab_bangla", False, f"exception: {e}")
    traceback.print_exc()


# ------------------------- TEST 5: Tool / function calling -------------------------
section("TEST 5 — Function calling (for RAG / drug-interaction tool)")
try:
    tools = [{
        "type": "function",
        "function": {
            "name": "check_drug_interaction",
            "description": "Check interaction between two drugs in the DGDA formulary.",
            "parameters": {
                "type": "object",
                "properties": {
                    "drug_a": {"type": "string"},
                    "drug_b": {"type": "string"}
                },
                "required": ["drug_a", "drug_b"]
            }
        }
    }]
    r = call([
        {"role": "system", "content":
         "You have a tool to check drug interactions. ALWAYS call it before commenting on safety."},
        {"role": "user", "content":
         "My doctor added Aspirin to my regimen. I am already taking Warfarin. Is this safe?"}
    ], tools=tools)
    msg = r.choices[0].message
    calls = msg.tool_calls or []
    ok = len(calls) > 0 and calls[0].function.name == "check_drug_interaction"
    sample = (calls[0].function.arguments if calls else (msg.content or ""))[:300]
    print("tool_calls:", calls)
    print("content:", msg.content)
    record("function_calling", ok, f"{len(calls)} tool calls", sample)
except Exception as e:
    record("function_calling", False, f"exception: {e}")
    traceback.print_exc()


# ------------------------- TEST 6: Latency snapshot -------------------------
section("TEST 6 — Latency for a small Bangla call")
try:
    t0 = time.time()
    r = call([{"role": "user", "content": "হ্যালো, এক লাইনে নিজের পরিচয় দাও।"}])
    dt = time.time() - t0
    ok = dt < 15
    record("latency_small", ok, f"{dt:.2f}s for a small call", (r.choices[0].message.content or "")[:200])
except Exception as e:
    record("latency_small", False, f"exception: {e}")


# ------------------------- SUMMARY -------------------------
section("SUMMARY")
for r in RESULTS:
    print(f"  [{'PASS' if r['ok'] else 'FAIL'}] {r['test']:24} — {r['note']}")
passed = sum(1 for r in RESULTS if r["ok"])
print(f"\n{passed}/{len(RESULTS)} tests passed")
