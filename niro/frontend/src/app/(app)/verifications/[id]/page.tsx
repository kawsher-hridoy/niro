"use client";

import Link from "next/link";
import { use as usePromise, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiError, type VerificationOut } from "@/lib/api";
import { toBangla } from "@/lib/i18n";

export default function VerificationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [v, setV] = useState<VerificationOut | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    refresh();
  }, [id]);

  function refresh() {
    apiGet<VerificationOut>(`/verifications/${id}`)
      .then(setV)
      .catch((e) => setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e)));
  }

  async function payNow() {
    setPaying(true);
    setErr(null);
    try {
      const updated = await apiPost<VerificationOut>(`/verifications/${id}/pay`, {});
      setV(updated);
    } catch (e) {
      setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
    } finally {
      setPaying(false);
    }
  }

  useEffect(() => {
    if (!v) return;
    if (v.payment_status === "paid" && !v.review_id) {
      const t = setInterval(refresh, 5000);
      return () => clearInterval(t);
    }
  }, [v?.payment_status, v?.review_id]);

  if (err && !v) return <InlineError message={err} onRetry={refresh} />;
  if (!v) return <div className="h-48 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 animate-pulse" />;

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{v.doctor_name}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">যাচাই অনুরোধ #{v.id.slice(0, 8)}</p>
      </header>

      <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <p className="text-sm text-[var(--color-muted)]">ফি</p>
        <p className="mt-1 text-3xl font-semibold text-[var(--color-foreground)]">৳{toBangla(v.fee_bdt)}</p>
        {v.payment_status === "pending" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--color-muted)]">ডাক্তার আপনার ডকুমেন্ট দেখার আগে পেমেন্ট সম্পন্ন করুন।</p>
            <button onClick={payNow} disabled={paying} className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{paying ? "পেমেন্ট প্রক্রিয়াধীন..." : "bKash দিয়ে পরিশোধ করুন (mock)"}</button>
          </div>
        )}
        {v.payment_status === "paid" && !v.review_id && <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">পেমেন্ট সম্পন্ন · ডাক্তার পর্যালোচনা করছেন...</p>}
        {v.review_id && v.review_disposition && <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{v.review_disposition}</p>}
        {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
      </section>

      <Link href="/verifications" className="inline-flex text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-sm">← ফিরে যান</Link>
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}{" "}<button type="button" onClick={onRetry} className="font-medium underline">আবার চেষ্টা করুন</button></div>;
}
