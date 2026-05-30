"use client";

import Link from "next/link";
import { ArrowLeft, Download, FileStack, Sparkles } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import {
  ApiError,
  downloadDocument,
  getRecords,
  type RecordGroup,
} from "@/lib/api";
import { toBangla } from "@/lib/i18n";
import { use, useEffect, useState } from "react";

export default function RecordTypePage(props: { params: Promise<{ type: string }> }) {
  const { type } = use(props.params);
  const [group, setGroup] = useState<RecordGroup | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    getRecords()
      .then((rows) => {
        if (!alive) return;
        const match = rows.find((g) => (g.report_type ?? "other") === type) ?? null;
        setGroup(match);
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
  }, [type]);

  async function handleDownload(documentId: string, name: string | null) {
    setBusyId(documentId);
    try {
      await downloadDocument(documentId, name ?? undefined);
    } catch {
      setErr("ফাইল ডাউনলোড করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/records"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft size={16} /> সব রেকর্ড
      </Link>

      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
          {group?.label_bn ?? "রেকর্ড"}
        </h1>
        {group && (
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {toBangla(group.count)}টি রিপোর্ট, সময় অনুযায়ী সাজানো
          </p>
        )}
      </header>

      {loading && <ListSkeleton />}
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      )}

      {!loading && !err && (!group || group.items.length === 0) && (
        <EmptyState
          icon={<FileStack size={28} />}
          title="এই ধরনের কোনো রিপোর্ট নেই।"
          body="ভিন্ন ধরনের রিপোর্ট দেখতে সব রেকর্ডে ফিরে যান।"
          cta={{ label: "আপলোড করুন", href: "/upload" }}
        />
      )}

      {!loading && !err && group && group.items.length > 0 && (
        <ol className="space-y-3">
          {group.items.map((item) => (
            <li
              key={item.analysis_id}
              className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-foreground)]">
                    {item.report_date
                      ? toBangla(item.report_date)
                      : "তারিখ পাওয়া যায়নি"}
                  </p>
                  {item.summary_bn && (
                    <p className="mt-1 truncate text-sm text-[var(--color-muted)]">
                      {item.summary_bn}
                    </p>
                  )}
                  {item.original_name && (
                    <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
                      {item.original_name}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(item.document_id, item.original_name)}
                    disabled={busyId === item.document_id}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-card-border)] px-3 py-1.5 text-sm text-[var(--color-foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
                  >
                    <Download size={14} />
                    {busyId === item.document_id ? "..." : "ডাউনলোড"}
                  </button>
                  <Link
                    href={`/analyses/${item.analysis_id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    <Sparkles size={14} /> বিশ্লেষণ
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-6 text-xs text-[var(--color-muted)]">
        এই সারাংশ AI দ্বারা সংগৃহীত — চিকিৎসকের পরামর্শ নয়।
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4"
        >
          <div className="h-4 w-28 rounded-full bg-[var(--color-accent-soft)]" />
          <div className="mt-3 h-3 w-52 rounded-full bg-[var(--color-accent-soft)]" />
        </div>
      ))}
    </div>
  );
}
