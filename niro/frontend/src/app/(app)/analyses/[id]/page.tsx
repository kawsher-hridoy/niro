"use client";

import Link from "next/link";
import { use as usePromise, useEffect, useState } from "react";
import { apiGet, ApiError, type AnalysisOut, type LabValue, type Medication, type RedFlag } from "@/lib/api";
import { toBangla } from "@/lib/i18n";

export default function AnalysisDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [a, setA] = useState<AnalysisOut | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<AnalysisOut>(`/analyses/${id}`)
      .then(setA)
      .catch((e) => setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="h-64 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 animate-pulse" />;
  if (err) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err} <Link href="/home" className="underline">← হোম</Link></div>;
  if (!a) return null;

  const meds = (a.structured.medications ?? []) as Medication[];
  const labValues = (a.structured.values ?? []) as LabValue[];

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{kindLabelBn(a.kind)} — AI বিশ্লেষণ</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">AI-এর সারাংশ, সতর্কতা, ও কাঠামোবদ্ধ তথ্য।</p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-[var(--color-card-border)] px-3 py-2 text-sm hover:bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          PDF
        </button>
      </header>

      {a.recommend_human_review && (
        <div className="rounded-xl border border-amber-200 bg-[var(--color-amber-soft)] px-4 py-3 text-sm text-amber-900">
          AI-এর আত্মবিশ্বাস কম ({toBangla(Math.round(a.confidence * 100))}%)। মানব ডাক্তারের যাচাই সুপারিশ করা হচ্ছে।
        </div>
      )}

      <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-semibold">সারসংক্ষেপ</h2>
        <p className="mt-3 whitespace-pre-wrap leading-relaxed text-[var(--color-foreground)]">{a.explanation_bn}</p>
      </section>

      {a.red_flags.length > 0 && (
        <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">সতর্কতা</h2>
          <ul className="mt-3 space-y-2">
            {a.red_flags.map((flag, index) => <RedFlagChip key={index} flag={flag} />)}
          </ul>
        </section>
      )}

      {meds.length > 0 && (
        <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">ওষুধ</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-card-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-accent-soft)] text-[var(--color-foreground)]">
                <tr>
                  <th className="px-3 py-2 text-left">নাম</th>
                  <th className="px-3 py-2 text-left">শক্তি</th>
                  <th className="px-3 py-2 text-left">ডোজ</th>
                  <th className="px-3 py-2 text-left">সময়কাল</th>
                </tr>
              </thead>
              <tbody>
                {meds.map((med, index) => (
                  <tr key={`${med.name}-${index}`} className="border-t border-[var(--color-card-border)]">
                    <td className="px-3 py-2 font-medium">{med.name}</td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">{med.strength}</td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">{med.dosage}{med.frequency ? ` · ${med.frequency}` : ""}</td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">{med.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {labValues.length > 0 && (
        <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">ল্যাব মান</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-card-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-accent-soft)] text-[var(--color-foreground)]">
                <tr>
                  <th className="px-3 py-2 text-left">প্যারামিটার</th>
                  <th className="px-3 py-2 text-left">মান</th>
                  <th className="px-3 py-2 text-left">রেফারেন্স</th>
                </tr>
              </thead>
              <tbody>
                {labValues.map((value, index) => (
                  <tr key={`${value.parameter}-${index}`} className="border-t border-[var(--color-card-border)]">
                    <td className="px-3 py-2 font-medium">{value.parameter}</td>
                    <td className={`px-3 py-2 ${value.abnormal ? "font-semibold text-red-700" : "text-[var(--color-muted)]"}`}>{value.value} {value.unit}</td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">{value.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {a.questions_bn.length > 0 && (
        <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">ডাক্তারকে জিজ্ঞাসা করার প্রশ্ন</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
            {a.questions_bn.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </section>
      )}

      <footer className="border-t border-[var(--color-card-border)] pt-4 text-xs text-[var(--color-muted)]">
        AI সারাংশ চিকিৎসকের পরামর্শ নয়। মডেল: {a.model_name} ({a.model_version}) · লেটেন্সি: {toBangla(a.latency_ms)} ms
      </footer>
    </div>
  );
}

function RedFlagChip({ flag }: { flag: RedFlag }) {
  const tone = flag.severity === "danger" ? "border-red-200 bg-red-50 text-red-700" : flag.severity === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-sky-200 bg-sky-50 text-sky-700";
  return <li className={`rounded-lg border px-3 py-2 text-sm ${tone}`}>{flag.label_bn}</li>;
}

function kindLabelBn(k: string): string {
  switch (k) {
    case "prescription": return "প্রেসক্রিপশন";
    case "lab_report": return "ল্যাব রিপোর্ট";
    case "discharge": return "ডিসচার্জ সামারি";
    default: return "ডকুমেন্ট";
  }
}
