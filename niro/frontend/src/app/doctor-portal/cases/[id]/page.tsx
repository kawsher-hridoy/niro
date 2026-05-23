"use client";

import { use as usePromise, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, ApiError, loadSession, type CaseView } from "@/lib/api";
import { toBangla } from "@/lib/i18n";

type PageProps = { params: Promise<{ id: string }> };

type Disposition = "agree" | "concerns" | "escalate";

export default function CaseReviewPage({ params }: PageProps) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [c, setC] = useState<CaseView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [disposition, setDisposition] = useState<Disposition>("agree");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.role !== "doctor") {
      setErr("শুধু ডাক্তার এই পেজ দেখতে পারেন।");
      return;
    }
    apiGet<CaseView>(`/doctor/cases/${id}`)
      .then(setC)
      .catch((e) => setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e)));
  }, [id, router]);

  async function submit() {
    if (!notes.trim()) {
      setErr("পর্যালোচনার নোট লিখুন।");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await apiPost(`/doctor/cases/${id}/review`, {
        disposition,
        ai_claims_eval: (c?.case_summary?.ai_concerns ?? []).map((cn, i) => ({
          claim_id: cn.claim_id ?? `${i}`,
          agree: disposition === "agree",
        })),
        doctor_notes_bn: notes.trim(),
      });
      setSubmitted(true);
    } catch (e) {
      setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!c) {
    return (
      <main className="p-8">
        {err ? <p className="text-red-700">{err}</p> : <p>লোড হচ্ছে...</p>}
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col px-6 py-10 max-w-3xl mx-auto w-full gap-6">
      <Link href="/doctor-portal/inbox" className="text-sm text-foreground/60 hover:text-foreground">
        ← ইনবক্স
      </Link>

      <header>
        <h1 className="text-2xl font-bold">{c.patient_name}</h1>
        <p className="text-xs text-foreground/50">{kindBn(c.document_kind)} · কেস #{c.request_id.slice(0, 8)}</p>
      </header>

      {/* AI case summary */}
      {c.case_summary && (
        <section className="rounded-2xl border-2 border-accent/30 p-5 bg-accent/[0.04]">
          <h2 className="font-semibold mb-2 text-accent">AI কেস সামারি</h2>
          {c.case_summary.patient_summary_bn && (
            <p className="text-sm whitespace-pre-wrap leading-relaxed mb-3">
              {c.case_summary.patient_summary_bn}
            </p>
          )}
          {(c.case_summary.current_medications ?? []).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-1">
                বর্তমান ওষুধ
              </p>
              <ul className="text-sm flex flex-wrap gap-2">
                {c.case_summary.current_medications!.map((m, i) => (
                  <li
                    key={i}
                    className="bg-white/70 dark:bg-white/5 px-2 py-1 rounded border border-foreground/10"
                  >
                    {m.name} {m.strength}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(c.case_summary.ai_concerns ?? []).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-1">
                AI-এর উদ্বেগ
              </p>
              <ul className="text-sm space-y-1">
                {c.case_summary.ai_concerns!.map((cn, i) => (
                  <li key={i} className="text-amber-800">
                    ⚠ {cn.claim_bn}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(c.case_summary.questions_for_doctor ?? []).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-1">
                ডাক্তারের কাছে নির্দিষ্ট প্রশ্ন
              </p>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {c.case_summary.questions_for_doctor!.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Target analysis */}
      {c.analysis && (
        <section className="rounded-xl border border-foreground/10 p-4 bg-foreground/[0.02]">
          <h2 className="font-semibold mb-2">টার্গেট বিশ্লেষণ</h2>
          <p className="text-sm whitespace-pre-wrap text-foreground/80">
            {c.analysis.explanation_bn}
          </p>
          <p className="text-xs text-foreground/50 mt-2">
            AI confidence: {toBangla(Math.round(c.analysis.confidence * 100))}%
          </p>
        </section>
      )}

      {/* History */}
      {c.history.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">হিস্ট্রি ({toBangla(c.history.length)})</h2>
          <ul className="flex flex-col gap-2">
            {c.history.map((h) => (
              <li
                key={h.id}
                className="border border-foreground/10 rounded-lg px-3 py-2 bg-foreground/[0.02]"
              >
                <p className="text-xs text-foreground/50">
                  {new Date(h.created_at).toLocaleString("bn-BD")}
                </p>
                <p className="text-sm mt-1 line-clamp-3">{h.explanation_bn}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Review form */}
      <section className="rounded-2xl border border-foreground/10 p-5 bg-foreground/[0.02]">
        <h2 className="font-semibold mb-3">আপনার পর্যালোচনা</h2>
        {submitted ? (
          <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded text-sm">
            ✓ পর্যালোচনা সফলভাবে জমা দেওয়া হয়েছে। রোগী এখন এটি দেখতে পাবেন।
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2 mb-4">
              {(["agree", "concerns", "escalate"] as Disposition[]).map((d) => (
                <label key={d} className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="disposition"
                    value={d}
                    checked={disposition === d}
                    onChange={() => setDisposition(d)}
                  />
                  <span>{dispositionBn(d)}</span>
                </label>
              ))}
            </div>
            <label className="flex flex-col gap-1 text-sm mb-3">
              <span className="font-medium">নোট (বাংলা)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="রোগীর জন্য আপনার মতামত লিখুন..."
                className="border border-foreground/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </label>
            {err && (
              <p className="text-sm text-red-700 mb-2">{err}</p>
            )}
            <button
              onClick={submit}
              disabled={submitting || !notes.trim()}
              className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium disabled:opacity-50"
            >
              {submitting ? "জমা দেওয়া হচ্ছে..." : "পর্যালোচনা জমা দিন"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function kindBn(k: string): string {
  switch (k) {
    case "prescription":
      return "প্রেসক্রিপশন";
    case "lab_report":
      return "ল্যাব রিপোর্ট";
    default:
      return "ডকুমেন্ট";
  }
}

function dispositionBn(d: Disposition): string {
  switch (d) {
    case "agree":
      return "AI-এর বিশ্লেষণের সাথে একমত";
    case "concerns":
      return "কিছু আপত্তি / সংশোধন আছে";
    case "escalate":
      return "আরও বিশেষজ্ঞের কাছে রেফার";
  }
}
