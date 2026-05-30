"use client";

import Link from "next/link";
import { FileStack, FolderOpen } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { ApiError, getRecords, type RecordGroup } from "@/lib/api";
import { toBangla } from "@/lib/i18n";
import { useEffect, useState } from "react";

export default function RecordsPage() {
  const [groups, setGroups] = useState<RecordGroup[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    getRecords()
      .then((rows) => {
        if (alive) setGroups(rows);
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
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
          স্বাস্থ্য রেকর্ড
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          রিপোর্টের ধরন অনুযায়ী সাজানো — যেমন ইকোকার্ডিওগ্রাফি, সিবিসি, প্রেসক্রিপশন
        </p>
      </header>

      {loading && <ListSkeleton />}
      {err && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div>
            <p>{err}</p>
            <button
              type="button"
              onClick={() => setRetryTick((v) => v + 1)}
              className="mt-1 font-medium underline"
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        </div>
      )}

      {!loading && !err && groups.length === 0 && (
        <EmptyState
          icon={<FileStack size={28} />}
          title="এখনো কোনো রেকর্ড নেই।"
          body="ডকুমেন্ট আপলোড ও বিশ্লেষণ করলে সেগুলো ধরন অনুযায়ী এখানে জমা হবে।"
          cta={{ label: "আপলোড করুন", href: "/upload" }}
        />
      )}

      {!loading && !err && groups.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <Link
              key={g.report_type ?? "other"}
              href={`/records/${g.report_type ?? "other"}`}
              className="group rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 transition-colors hover:border-[var(--color-primary)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-primary)]">
                    <FolderOpen size={20} />
                  </span>
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">{g.label_bn}</p>
                    <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                      {toBangla(g.count)}টি রিপোর্ট
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4"
        >
          <div className="h-4 w-32 rounded-full bg-[var(--color-accent-soft)]" />
          <div className="mt-3 h-3 w-20 rounded-full bg-[var(--color-accent-soft)]" />
        </div>
      ))}
    </div>
  );
}
