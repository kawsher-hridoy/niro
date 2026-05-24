"use client";

import { AlertCircle, ShieldCheck } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { apiGet, ApiError, type AccessLogEntry } from "@/lib/api";
import { timeAgoBn } from "@/lib/i18n";
import { useEffect, useState } from "react";

export default function AccessLogPage() {
  const [items, setItems] = useState<AccessLogEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    apiGet<AccessLogEntry[]>("/me/access-log")
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
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">অ্যাক্সেস লগ</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">কোন ডাক্তার কখন আপনার ডেটা দেখেছেন।</p>
      </header>
      {loading && <ListSkeleton />}
      {err && <InlineError message={err} onRetry={() => setRetryTick((v) => v + 1)} />}
      {!loading && !err && items.length === 0 && <EmptyState icon={<ShieldCheck size={28} />} title="এখনো কোনো প্রবেশ নেই।" body="কেউ আপনার প্রোফাইল দেখেনি।" />}
      {!loading && !err && <div className="space-y-2">
        {items.map((i) => (
          <article key={i.id} className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-[var(--color-foreground)]">{i.doctor_name ?? "অজানা"}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{screenLabelBn(i.screen)}{i.location ? ` · ${i.location}` : ""}</p>
              </div>
              <span className="text-xs text-[var(--color-muted)]">{timeAgoBn(i.viewed_at)}</span>
            </div>
          </article>
        ))}
      </div>}
    </div>
  );
}

function screenLabelBn(s: string): string {
  switch (s) {
    case "case_summary": return "কেস সামারি দেখেছেন";
    case "timeline": return "টাইমলাইন দেখেছেন";
    case "document": return "ডকুমেন্ট দেখেছেন";
    default: return s;
  }
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div><p>{message}</p><button type="button" onClick={onRetry} className="mt-1 font-medium underline">আবার চেষ্টা করুন</button></div></div>;
}

function ListSkeleton() {
  return <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 animate-pulse" />)}</div>;
}
