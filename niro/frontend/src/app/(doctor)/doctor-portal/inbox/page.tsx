"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { apiGet, ApiError } from "@/lib/api";
import { timeAgoBn, toBangla } from "@/lib/i18n";
import { useEffect, useState } from "react";

type InboxItem = {
  request_id: string;
  patient_id: string;
  patient_name: string;
  document_id: string;
  document_kind: string;
  fee_bdt: number;
  payment_status: string;
  created_at: string;
  due_by: string;
  has_review: boolean;
};

export default function DoctorInboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    apiGet<InboxItem[]>("/doctor/inbox")
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

  const pending = items.filter((i) => !i.has_review);
  const done = items.filter((i) => i.has_review);

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">ইনবক্স</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">যাচাইয়ের অপেক্ষায় থাকা কেসগুলো।</p>
      </header>
      {loading && <ListSkeleton />}
      {err && <InlineError message={err} onRetry={() => setRetryTick((v) => v + 1)} />}

      {!loading && !err && <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--color-muted)]">অপেক্ষমাণ ({toBangla(pending.length)})</h2>
        {pending.length === 0 ? <p className="text-sm text-[var(--color-muted)]">কোনো অপেক্ষমাণ কেস নেই।</p> : pending.map((i) => <CaseLink key={i.request_id} item={i} />)}
      </section>}

      {!loading && !err && done.length > 0 && <section className="space-y-3"><h2 className="text-sm font-medium uppercase tracking-wider text-[var(--color-muted)]">সম্পন্ন ({toBangla(done.length)})</h2>{done.map((i) => <CaseLink key={i.request_id} item={i} done />)}</section>}
    </div>
  );
}

function CaseLink({ item, done = false }: { item: InboxItem; done?: boolean }) {
  return <article className={`rounded-xl border p-4 ${done ? "border-[var(--color-card-border)] bg-[var(--color-card)] opacity-80" : "border-[var(--color-card-border)] bg-[var(--color-card)]"}`}><div className="flex items-center justify-between gap-4"><div><p className="font-medium text-[var(--color-foreground)]">{item.patient_name}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{kindBn(item.document_kind)} · ৳{toBangla(item.fee_bdt)} · {timeAgoBn(item.created_at)}</p></div><Link href={`/doctor-portal/cases/${item.request_id}`} className="text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-sm">{done ? "পর্যালোচনা দেখুন →" : "পর্যালোচনা করুন →"}</Link></div></article>;
}

function kindBn(k: string): string { return k === "prescription" ? "প্রেসক্রিপশন" : k === "lab_report" ? "ল্যাব রিপোর্ট" : "ডকুমেন্ট"; }

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div><p>{message}</p><button type="button" onClick={onRetry} className="mt-1 font-medium underline">আবার চেষ্টা করুন</button></div></div>;
}

function ListSkeleton() {
  return <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 animate-pulse" />)}</div>;
}
