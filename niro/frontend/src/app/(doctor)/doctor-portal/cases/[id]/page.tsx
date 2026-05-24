"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { use as usePromise, useEffect, useState } from "react";
import { apiGet, apiPost, ApiError, type CaseView } from "@/lib/api";
import { toBangla } from "@/lib/i18n";

export default function CaseReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [c, setC] = useState<CaseView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [disposition, setDisposition] = useState<"agree" | "concerns" | "escalate">("agree");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let alive = true;
    setErr(null);
    apiGet<CaseView>(`/doctor/cases/${id}`)
      .then((data) => {
        if (alive) setC(data);
      })
      .catch((e) => {
        if (alive) setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
      });
    return () => {
      alive = false;
    };
  }, [id, retryTick]);

  async function submit() {
    if (!notes.trim()) {
      setErr("পর্যালোচনার নোট লিখুন।");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await apiPost(`/doctor/cases/${id}/review`, { disposition, ai_claims_eval: (c?.case_summary?.ai_concerns ?? []).map((cn, i) => ({ claim_id: cn.claim_id ?? `${i}`, agree: disposition === "agree" })), doctor_notes_bn: notes.trim() });
      setSubmitted(true);
    } catch (e) {
      setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (err && !c) return <InlineError message={err} onRetry={() => setRetryTick((v) => v + 1)} />;
  if (!c) return <div className="h-64 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 animate-pulse" />;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{c.patient_name}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{kindBn(c.document_kind)} · কেস #{c.request_id.slice(0, 8)}</p>
      </header>

      {c.case_summary && <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"><h2 className="font-semibold">AI কেস সামারি</h2><p className="mt-3 text-sm leading-relaxed text-[var(--color-foreground)]">{c.case_summary.patient_summary_bn ?? ""}</p></section>}
      {c.analysis && <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"><h2 className="font-semibold">টার্গেট বিশ্লেষণ</h2><p className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-muted)]">{c.analysis.explanation_bn}</p></section>}
      {c.history.length > 0 && <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"><h2 className="font-semibold">হিস্ট্রি ({toBangla(c.history.length)})</h2><div className="mt-3 space-y-2">{c.history.map((h) => <article key={h.id} className="rounded-lg border border-[var(--color-card-border)] px-3 py-2 text-sm text-[var(--color-muted)]"><p>{new Date(h.created_at).toLocaleString("bn-BD")}</p><p className="mt-1">{h.explanation_bn}</p></article>)}</div></section>}

      <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-semibold">আপনার পর্যালোচনা</h2>
        {submitted ? <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">পর্যালোচনা জমা হয়েছে।</p> : <div className="mt-4 space-y-4"><div className="space-y-2">{(["agree", "concerns", "escalate"] as const).map((d) => <label key={d} className="flex items-center gap-3 text-sm"><input type="radio" name="disposition" value={d} checked={disposition === d} onChange={() => setDisposition(d)} />{dispositionBn(d)}</label>)}</div><label className="flex flex-col gap-2 text-sm"><span className="font-medium">নোট (বাংলা)</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-background)] px-3 py-2" /></label><button onClick={submit} disabled={submitting || !notes.trim()} className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{submitting ? "জমা দেওয়া হচ্ছে..." : "পর্যালোচনা জমা দিন"}</button></div>}
        {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
      </section>

      <Link href="/doctor-portal/inbox" className="inline-flex text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-sm">← ইনবক্স</Link>
    </div>
  );
}

function kindBn(k: string): string { return k === "prescription" ? "প্রেসক্রিপশন" : k === "lab_report" ? "ল্যাব রিপোর্ট" : "ডকুমেন্ট"; }
function dispositionBn(d: "agree" | "concerns" | "escalate"): string { return d === "agree" ? "AI-এর বিশ্লেষণের সাথে একমত" : d === "concerns" ? "কিছু আপত্তি / সংশোধন আছে" : "আরও বিশেষজ্ঞের কাছে রেফার"; }
function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div><p>{message}</p><button type="button" onClick={onRetry} className="mt-1 font-medium underline">আবার চেষ্টা করুন</button></div></div>; }
