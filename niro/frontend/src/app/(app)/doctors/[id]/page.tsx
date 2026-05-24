"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { use as usePromise, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiError, type DoctorProfileOut, type DocumentOut, type VerificationOut } from "@/lib/api";
import { toBangla } from "@/lib/i18n";

export default function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [d, setD] = useState<DoctorProfileOut | null>(null);
  const [docs, setDocs] = useState<DocumentOut[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [reqLoading, setReqLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setErr(null);
    Promise.all([apiGet<DoctorProfileOut>(`/doctors/${id}`), apiGet<DocumentOut[]>("/documents")])
      .then(([dp, ds]) => {
        if (!alive) return;
        setD(dp);
        setDocs(ds);
      })
      .catch((e) => {
        if (alive) setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
      });
    return () => {
      alive = false;
    };
  }, [id, retryTick]);

  async function requestVerification(documentId: string) {
    setReqLoading(true);
    setErr(null);
    try {
      const v = await apiPost<VerificationOut>("/verifications", {
        doctor_id: id,
        document_id: documentId,
        scope: "full_history",
        expires_in_hours: 24,
      });
      router.push(`/verifications/${v.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
      setReqLoading(false);
    }
  }

  if (err && !d) {
    return <InlineError message={err} onRetry={() => setRetryTick((v) => v + 1)} />;
  }
  if (!d) {
    return <div className="h-48 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{d.full_name}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">BMDC {d.bmdc_number} · {d.specialties.join(" · ")}</p>
        {d.bio && <p className="mt-3 text-sm text-[var(--color-muted)]">{d.bio}</p>}
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="যাচাই ফি" value={`৳${toBangla(d.fee_bdt)}`} />
        <Card title="রেটিং" value={d.rating_count > 0 ? `★ ${(d.rating_avg ?? 0).toFixed(1)}` : "—"} meta={`${toBangla(d.rating_count)} জন রোগী`} />
      </section>

      {d.qualifications.length > 0 && (
        <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">শিক্ষাগত যোগ্যতা</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
            {d.qualifications.map((q, i) => <li key={i}>{q.degree} {q.year ? `(${toBangla(q.year)})` : ""}{q.institution ? ` — ${q.institution}` : ""}</li>)}
          </ul>
        </section>
      )}

      {d.chambers.length > 0 && (
        <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">চেম্বার</h2>
          <div className="mt-3 space-y-2">
            {d.chambers.map((c, i) => (
              <div key={i} className="rounded-lg border border-[var(--color-card-border)] px-3 py-2">
                <p className="font-medium">{c.name}</p>
                {c.address && <p className="text-sm text-[var(--color-muted)]">{c.address}</p>}
                {c.hours && <p className="text-xs text-[var(--color-muted)]">{c.hours}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-semibold">এই ডাক্তারকে যাচাই করুন</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">যাচাইয়ের আগে একটি ডকুমেন্ট বেছে নিন।</p>
        {docs.length === 0 ? (
          <EmptyStateLike />
        ) : (
          <div className="mt-4 space-y-2">
            {docs.slice(0, 5).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-card-border)] px-3 py-2">
                <span className="text-sm text-[var(--color-foreground)]">{kindLabelBn(doc.kind)}{doc.original_name ? ` · ${doc.original_name}` : ""}</span>
                <button onClick={() => requestVerification(doc.id)} disabled={reqLoading} className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">অনুরোধ</button>
              </div>
            ))}
          </div>
        )}
        {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
      </section>

      {d.reviews.length > 0 && (
        <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">রোগীর পর্যালোচনা</h2>
          <div className="mt-3 space-y-2">
            {d.reviews.map((r) => (
              <div key={r.id} className="rounded-lg border border-[var(--color-card-border)] px-3 py-2 text-sm text-[var(--color-muted)]">
                <p>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                {r.text && <p className="mt-1">{r.text}</p>}
                <p className="mt-1">— {r.patient_name}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Card({ title, value, meta }: { title: string; value: string; meta?: string }) {
  return <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"><p className="text-sm text-[var(--color-muted)]">{title}</p><p className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">{value}</p>{meta && <p className="mt-1 text-sm text-[var(--color-muted)]">{meta}</p>}</div>;
}

function EmptyStateLike() {
  return <p className="mt-4 text-sm text-[var(--color-muted)]">যাচাই করার জন্য আগে একটি ডকুমেন্ট আপলোড করুন।</p>;
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div><p>{message}</p><button type="button" onClick={onRetry} className="mt-1 font-medium underline">আবার চেষ্টা করুন</button></div></div>;
}

function kindLabelBn(k: string): string {
  switch (k) {
    case "prescription": return "প্রেসক্রিপশন";
    case "lab_report": return "ল্যাব রিপোর্ট";
    case "discharge": return "ডিসচার্জ সামারি";
    default: return "ডকুমেন্ট";
  }
}
