"use client";

import Link from "next/link";
import { AlertCircle, Clock, FileText, Sparkles } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { apiGet, ApiError, type TimelineEntry } from "@/lib/api";
import { timeAgoBn } from "@/lib/i18n";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function TimelineContent() {
  const search = useSearchParams();
  const type = search.get("type");
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    apiGet<TimelineEntry[]>("/me/timeline")
      .then((rows) => {
        if (alive) setEntries(rows);
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

  const filtered = useMemo(() => {
    if (!type) return entries;
    if (type === 'analysis') return entries.filter((e) => e.entry_type === 'analysis');
    if (type === 'document') return entries.filter((e) => e.entry_type === 'document');
    return entries;
  }, [entries, type]);

  const title = type === 'analysis' ? 'AI বিশ্লেষণ' : type === 'document' ? 'ডকুমেন্ট' : 'টাইমলাইন';
  const subtitle = type === 'analysis' ? 'আপনার সাম্প্রতিক AI সারাংশ' : 'ডকুমেন্ট, বিশ্লেষণ, এবং ডাক্তার পর্যালোচনার ইতিহাস';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>
      </header>

      {loading && <ListSkeleton />}
      {err && <InlineError message={err} onRetry={() => setRetryTick((v) => v + 1)} />}

      {!loading && !err && filtered.length === 0 && (
        <EmptyState
          icon={type === 'analysis' ? <Sparkles size={28} /> : <FileText size={28} />}
          title={type === 'analysis' ? 'এখনো AI বিশ্লেষণ নেই।' : 'এখনো কোনো এন্ট্রি নেই।'}
          body={type === 'analysis' ? 'ডকুমেন্ট আপলোড করলে এখানে বিশ্লেষণ দেখাবে।' : 'আপনার ডকুমেন্ট এবং যাচাইয়ের ইতিহাস এখানে দেখা যাবে।'}
          cta={type === 'analysis' ? { label: 'আপলোড করুন', href: '/upload' } : { label: 'আপলোড করুন', href: '/upload' }}
        />
      )}

      {!loading && !err && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((entry, index) => (
            <article key={`${entry.entry_type}-${index}`} className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--color-foreground)]">{entry.title_bn}</p>
                  {entry.subtitle_bn && <p className="mt-1 text-sm text-[var(--color-muted)]">{entry.subtitle_bn}</p>}
                </div>
                <span className="shrink-0 text-xs text-[var(--color-muted)]">{timeAgoBn(entry.occurred_at)}</span>
              </div>
              {entry.analysis_id && (
                <Link href={`/analyses/${entry.analysis_id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-sm">
                  বিশ্লেষণ দেখুন <Clock size={14} className="hidden" />
                </Link>
              )}
              {entry.review_id && (
                <span className="mt-3 inline-flex rounded-full bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-medium text-[var(--color-primary)]">
                  ডাক্তার পর্যালোচনা
                </span>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <TimelineContent />
    </Suspense>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 animate-pulse">
          <div className="h-4 w-40 rounded-full bg-[var(--color-accent-soft)]" />
          <div className="mt-3 h-3 w-60 rounded-full bg-[var(--color-accent-soft)]" />
        </div>
      ))}
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <div>
        <p>{message}</p>
        <button type="button" onClick={onRetry} className="mt-1 font-medium underline">
          আবার চেষ্টা করুন
        </button>
      </div>
    </div>
  );
}
