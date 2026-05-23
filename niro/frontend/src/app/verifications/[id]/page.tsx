"use client";

import { use as usePromise, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, ApiError, loadSession, type VerificationOut } from "@/lib/api";
import { toBangla } from "@/lib/i18n";

type PageProps = { params: Promise<{ id: string }> };

const DISPOSITION_BN: Record<string, string> = {
  agree: "AI-এর সাথে একমত",
  concerns: "কিছু আপত্তি আছে",
  escalate: "আরও বিশেষজ্ঞ লাগবে",
};

export default function VerificationDetail({ params }: PageProps) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [v, setV] = useState<VerificationOut | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!loadSession()) {
      router.replace("/signin");
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  function refresh() {
    apiGet<VerificationOut>(`/verifications/${id}`)
      .then(setV)
      .catch((e) => setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e)));
  }

  async function payNow() {
    setPaying(true);
    setErr(null);
    try {
      const updated = await apiPost<VerificationOut>(
        `/verifications/${id}/pay`,
        {}
      );
      setV(updated);
    } catch (e) {
      setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
    } finally {
      setPaying(false);
    }
  }

  // Auto-refresh while waiting for doctor review.
  useEffect(() => {
    if (!v) return;
    if (v.payment_status === "paid" && !v.review_id) {
      const t = setInterval(refresh, 5000);
      return () => clearInterval(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v?.payment_status, v?.review_id]);

  if (!v) {
    return (
      <main className="p-8">
        {err ? <p className="text-red-700">{err}</p> : <p>লোড হচ্ছে...</p>}
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col px-6 py-10 max-w-2xl mx-auto w-full gap-6">
      <Link
        href="/verifications"
        className="text-sm text-foreground/60 hover:text-foreground"
      >
        ← যাচাই অনুরোধ
      </Link>

      <header>
        <h1 className="text-2xl font-bold">{v.doctor_name}</h1>
        <p className="text-sm text-foreground/60">যাচাই অনুরোধ #{v.id.slice(0, 8)}</p>
      </header>

      <section className="rounded-2xl border border-foreground/10 p-5 bg-foreground/[0.02]">
        <p className="text-xs text-foreground/50 uppercase">ফি</p>
        <p className="text-3xl font-bold text-accent">৳{toBangla(v.fee_bdt)}</p>

        {v.payment_status === "pending" && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-foreground/70">
              ডাক্তার আপনার ডকুমেন্ট দেখার আগে পেমেন্ট সম্পন্ন করুন।
            </p>
            <button
              onClick={payNow}
              disabled={paying}
              className="px-5 py-3 rounded-lg bg-accent text-white font-medium disabled:opacity-50"
            >
              {paying ? "পেমেন্ট প্রক্রিয়াধীন..." : "bKash দিয়ে পরিশোধ করুন (mock)"}
            </button>
            <p className="text-xs text-foreground/50">
              Phase 1 ডেমোতে পেমেন্ট mock-ed। আসল bKash sandbox Phase 2-এ।
            </p>
          </div>
        )}

        {v.payment_status === "paid" && !v.review_id && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm text-sky-700 bg-sky-50 border border-sky-200 px-3 py-2 rounded">
              ✓ পেমেন্ট সম্পন্ন (TX {v.transaction_id})।
              <br />
              ডাক্তার পর্যালোচনা করছেন... auto-refresh চালু আছে।
            </p>
          </div>
        )}

        {v.review_id && v.review_disposition && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm font-medium text-emerald-700">
              ✓ {DISPOSITION_BN[v.review_disposition] ?? v.review_disposition}
            </p>
            <p className="text-xs text-foreground/50">
              পর্যালোচনা সম্পন্ন · TX {v.transaction_id}
            </p>
            <Link
              href={`/analyses/${v.document_id}`}
              className="text-sm text-accent hover:underline"
            >
              মূল ডকুমেন্ট দেখুন →
            </Link>
          </div>
        )}
      </section>

      {err && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
          {err}
        </p>
      )}
    </main>
  );
}
