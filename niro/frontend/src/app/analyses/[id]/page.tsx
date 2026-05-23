"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, ApiError, loadSession, type AnalysisOut } from "@/lib/api";
import { toBangla } from "@/lib/i18n";

type PageProps = { params: Promise<{ id: string }> };

export default function AnalysisDetail({ params }: PageProps) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [a, setA] = useState<AnalysisOut | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loadSession()) {
      router.replace("/signin");
      return;
    }
    apiGet<AnalysisOut>(`/analyses/${id}`)
      .then(setA)
      .catch((e) =>
        setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e))
      )
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return <main className="p-8">লোড হচ্ছে...</main>;
  if (err)
    return (
      <main className="p-8">
        <p className="text-red-700">{err}</p>
        <Link href="/home" className="text-accent">
          ← হোম
        </Link>
      </main>
    );
  if (!a) return null;

  const conf = Math.round(a.confidence * 100);
  const meds = (a.structured.medications ?? []) as Array<{
    name: string;
    strength?: string | null;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    notes?: string | null;
  }>;
  const labValues = (a.structured.values ?? []) as Array<{
    parameter: string;
    value: string;
    unit?: string | null;
    reference?: string | null;
    abnormal?: boolean;
  }>;

  return (
    <main className="flex-1 flex flex-col px-6 py-8 max-w-3xl mx-auto w-full gap-6">
      <Link href="/home" className="text-sm text-foreground/60 hover:text-foreground">
        ← আপনার নিরো
      </Link>

      <header className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-accent">
          {kindLabelBn(a.kind)} — AI বিশ্লেষণ
        </h1>
        <ConfidenceBadge confidence={a.confidence} />
      </header>

      {a.recommend_human_review && (
        <div className="border-2 border-amber-300 bg-amber-50 rounded-xl px-4 py-3 text-amber-900 text-sm">
          ⚠ AI-এর আত্মবিশ্বাস কম ({toBangla(conf)}%)। মানব ডাক্তারের যাচাই
          সুপারিশ করা হচ্ছে।{" "}
          <Link href="#" className="underline">
            যাচাই অনুরোধ করুন →
          </Link>
        </div>
      )}

      {/* Explanation */}
      <section className="rounded-2xl border border-foreground/10 p-5 bg-foreground/[0.02]">
        <h2 className="font-semibold mb-2">সারসংক্ষেপ</h2>
        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
          {a.explanation_bn}
        </p>
      </section>

      {/* Red flags */}
      {a.red_flags.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">সতর্কতা</h2>
          <ul className="flex flex-col gap-2">
            {a.red_flags.map((rf, i) => (
              <RedFlagChip key={i} flag={rf} />
            ))}
          </ul>
        </section>
      )}

      {/* Medications */}
      {meds.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">ওষুধ</h2>
          <div className="overflow-x-auto rounded-xl border border-foreground/10">
            <table className="w-full text-sm">
              <thead className="bg-foreground/[0.05] text-foreground/70">
                <tr>
                  <th className="text-left px-3 py-2">নাম</th>
                  <th className="text-left px-3 py-2">শক্তি</th>
                  <th className="text-left px-3 py-2">ডোজ</th>
                  <th className="text-left px-3 py-2">সময়কাল</th>
                </tr>
              </thead>
              <tbody>
                {meds.map((m, i) => (
                  <tr key={i} className="border-t border-foreground/5">
                    <td className="px-3 py-2 font-medium">{m.name}</td>
                    <td className="px-3 py-2 text-foreground/70">{m.strength}</td>
                    <td className="px-3 py-2 text-foreground/70">
                      {m.dosage}
                      {m.frequency ? ` · ${m.frequency}` : ""}
                    </td>
                    <td className="px-3 py-2 text-foreground/70">{m.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Lab values */}
      {labValues.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">ল্যাব মান</h2>
          <div className="overflow-x-auto rounded-xl border border-foreground/10">
            <table className="w-full text-sm">
              <thead className="bg-foreground/[0.05] text-foreground/70">
                <tr>
                  <th className="text-left px-3 py-2">প্যারামিটার</th>
                  <th className="text-left px-3 py-2">মান</th>
                  <th className="text-left px-3 py-2">রেফারেন্স</th>
                </tr>
              </thead>
              <tbody>
                {labValues.map((v, i) => (
                  <tr key={i} className="border-t border-foreground/5">
                    <td className="px-3 py-2 font-medium">{v.parameter}</td>
                    <td
                      className={`px-3 py-2 ${
                        v.abnormal ? "text-red-700 font-semibold" : "text-foreground/80"
                      }`}
                    >
                      {v.value} {v.unit}
                    </td>
                    <td className="px-3 py-2 text-foreground/60">{v.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Questions for doctor */}
      {a.questions_bn.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">ডাক্তারকে জিজ্ঞাসা করার প্রশ্ন</h2>
          <ul className="list-disc pl-6 space-y-1 text-foreground/80">
            {a.questions_bn.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-6 text-xs text-foreground/40 border-t border-foreground/10 pt-4">
        মডেল: {a.model_name} ({a.model_version}) · লেটেন্সি:{" "}
        {toBangla(a.latency_ms)} ms
      </footer>
    </main>
  );
}

function kindLabelBn(k: string): string {
  switch (k) {
    case "prescription":
      return "প্রেসক্রিপশন";
    case "lab_report":
      return "ল্যাব রিপোর্ট";
    case "discharge":
      return "ডিসচার্জ সামারি";
    default:
      return "ডকুমেন্ট";
  }
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone =
    confidence >= 0.85
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : confidence >= 0.5
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${tone}`}
      title={`Confidence ${pct}%`}
    >
      ● {toBangla(pct)}% নিশ্চিত
    </span>
  );
}

function RedFlagChip({ flag }: { flag: { label_bn: string; severity: string } }) {
  const tone =
    flag.severity === "danger"
      ? "bg-red-50 text-red-700 border-red-200"
      : flag.severity === "warn"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-sky-50 text-sky-700 border-sky-200";
  const icon =
    flag.severity === "danger" ? "⚠" : flag.severity === "warn" ? "⚠" : "ℹ";
  return (
    <li className={`text-sm px-3 py-2 rounded-lg border ${tone}`}>
      <span className="mr-1.5">{icon}</span>
      {flag.label_bn}
    </li>
  );
}
