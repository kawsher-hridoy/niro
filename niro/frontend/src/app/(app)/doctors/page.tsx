"use client";

import Link from "next/link";
import { AlertCircle, BadgeCheck, Search } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { apiGet, ApiError, type DoctorCard } from "@/lib/api";
import { toBangla } from "@/lib/i18n";
import { useEffect, useState } from "react";

const SPECIALTIES: Array<{ id: string; label_bn: string }> = [
  { id: "", label_bn: "সব" },
  { id: "diabetes", label_bn: "ডায়াবেটিস" },
  { id: "cardiology", label_bn: "হৃদরোগ" },
  { id: "eye", label_bn: "চোখ" },
  { id: "pediatrics", label_bn: "শিশু" },
  { id: "ent", label_bn: "ENT" },
  { id: "medicine", label_bn: "মেডিসিন" },
];

const TIERS = [
  { id: 0, label_bn: "যেকোনো ফি" },
  { id: 1, label_bn: "MBBS — ২০০ ৳" },
  { id: 2, label_bn: "FCPS/MD — ৪০০ ৳" },
  { id: 3, label_bn: "সিনিয়র — ৮০০ ৳" },
];

export default function DoctorsDirectory() {
  const [docs, setDocs] = useState<DoctorCard[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [specialty, setSpecialty] = useState("");
  const [tier, setTier] = useState(0);
  const [q, setQ] = useState("");
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams();
    if (specialty) params.set("specialty", specialty);
    if (tier > 0) params.set("fee_tier", String(tier));
    if (q.trim()) params.set("q", q.trim());
    setLoaded(false);
    setErr(null);
    apiGet<DoctorCard[]>(`/doctors${params.size ? `?${params}` : ""}`)
      .then((rows) => {
        if (alive) setDocs(rows);
      })
      .catch((e) => {
        if (alive) setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [specialty, tier, q, retryTick]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">ডাক্তার ডিরেক্টরি</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">বিশেষজ্ঞ ও যাচাইকৃত ডাক্তার খুঁজুন।</p>
      </header>

      <div className="grid gap-3 md:grid-cols-[1fr_180px_1fr]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted)]">বিশেষত্ব</span>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2">
            {SPECIALTIES.map((s) => <option key={s.id} value={s.id}>{s.label_bn}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted)]">ফি</span>
          <select value={tier} onChange={(e) => setTier(Number(e.target.value))} className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2">
            {TIERS.map((t) => <option key={t.id} value={t.id}>{t.label_bn}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted)]">খুঁজুন</span>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম দিয়ে খুঁজুন" className="w-full rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] py-2 pl-9 pr-3" />
          </div>
        </label>
      </div>

      {!loaded && <ListSkeleton />}
      {err && <InlineError message={err} onRetry={() => setRetryTick((v) => v + 1)} />}
      {loaded && !err && docs.length === 0 && (
        <EmptyState icon={<BadgeCheck size={28} />} title="কোনো ডাক্তার পাওয়া যায়নি।" body="ফিল্টার বদলে আবার চেষ্টা করুন।" />
      )}

      <div className="space-y-3">
        {docs.map((d) => (
          <article key={d.id} className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-[var(--color-foreground)]">{d.full_name}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">BMDC {d.bmdc_number} · {d.specialties.slice(0, 3).join(" · ")}</p>
                {d.chambers[0] && <p className="mt-1 text-sm text-[var(--color-muted)]">{d.chambers[0].name}</p>}
              </div>
              <div className="text-left md:text-right">
                <p className="text-lg font-semibold text-[var(--color-primary)]">৳{toBangla(d.fee_bdt)}</p>
                <p className="text-sm text-[var(--color-muted)]">{d.rating_count > 0 ? `★ ${(d.rating_avg ?? 0).toFixed(1)} (${toBangla(d.rating_count)})` : "নতুন"}</p>
                <Link href={`/doctors/${d.id}`} className="mt-2 inline-flex text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-sm">
                  বিস্তারিত →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 animate-pulse" />
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
