"use client";

import Link from "next/link";
import { AlertCircle, BadgeCheck } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { apiGet, ApiError, type VerificationOut } from "@/lib/api";
import { toBangla, timeAgoBn } from "@/lib/i18n";
import { useEffect, useState } from "react";

const DISPOSITION_BN: Record<string, string> = {
  agree: "AI-এর সাথে একমত",
  concerns: "কিছু আপত্তি আছে",
  escalate: "আরও বিশেষজ্ঞ লাগবে",
};

export default function VerificationsPage() {
  const [items, setItems] = useState<VerificationOut[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    apiGet<VerificationOut[]>("/verifications")
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch((e) => {
        if (alive) setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [retryTick]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">যাচাই অনুরোধ</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">ডাক্তারের পর্যালোচনা ও পেমেন্ট অবস্থা।</p>
      </header>
      {loading && <ListSkeleton />}
      {err && <InlineError message={err} onRetry={() => setRetryTick((v) => v + 1)} />}
      {!loading && !err && items.length === 0 && <EmptyState icon={<BadgeCheck size={28} />} title="এখনো কোনো অনুরোধ নেই।" body="ডাক্তার ডিরেক্টরি থেকে শুরু করুন।" cta={{ label: "ডাক্তার খুঁজুন", href: "/doctors" }} />}
      {!loading && !err && <div className="space-y-3">
        {items.map((v) => (
          <article key={v.id} className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-[var(--color-foreground)]">{v.doctor_name}</p>
              <StatusChip v={v} />
            </div>
            <p className="mt-1 text-sm text-[var(--color-muted)]">৳{toBangla(v.fee_bdt)} · {timeAgoBn(v.created_at)}</p>
            {v.review_disposition && <p className="mt-2 text-sm text-emerald-700">{DISPOSITION_BN[v.review_disposition] ?? v.review_disposition}</p>}
            <Link href={`/verifications/${v.id}`} className="mt-3 inline-flex text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-sm">বিস্তারিত →</Link>
          </article>
        ))}
      </div>}
    </div>
  );
}

function StatusChip({ v }: { v: VerificationOut }) {
  if (v.review_id) return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">সম্পন্ন</span>;
  if (v.payment_status === "paid") return <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-700">ডাক্তারের পর্যালোচনা চলছে</span>;
  return <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">পেমেন্ট pending</span>;
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div><p>{message}</p><button type="button" onClick={onRetry} className="mt-1 font-medium underline">আবার চেষ্টা করুন</button></div></div>;
}

function ListSkeleton() {
  return <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 animate-pulse" />)}</div>;
}
