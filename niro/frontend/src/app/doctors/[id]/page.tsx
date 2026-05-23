"use client";

import { use as usePromise, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  apiGet,
  apiPost,
  ApiError,
  loadSession,
  type DoctorProfileOut,
  type DocumentOut,
  type VerificationOut,
} from "@/lib/api";
import { toBangla } from "@/lib/i18n";

type PageProps = { params: Promise<{ id: string }> };

export default function DoctorProfilePage({ params }: PageProps) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [d, setD] = useState<DoctorProfileOut | null>(null);
  const [docs, setDocs] = useState<DocumentOut[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [reqLoading, setReqLoading] = useState(false);

  useEffect(() => {
    if (!loadSession()) {
      router.replace("/signin");
      return;
    }
    Promise.all([
      apiGet<DoctorProfileOut>(`/doctors/${id}`),
      apiGet<DocumentOut[]>("/documents"),
    ])
      .then(([dp, ds]) => {
        setD(dp);
        setDocs(ds);
      })
      .catch((e) => setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e)));
  }, [id, router]);

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

  if (!d) {
    return (
      <main className="p-8">
        {err ? <p className="text-red-700">{err}</p> : <p>লোড হচ্ছে...</p>}
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col px-6 py-10 max-w-3xl mx-auto w-full gap-6">
      <Link href="/doctors" className="text-sm text-foreground/60 hover:text-foreground">
        ← ডাক্তার ডিরেক্টরি
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{d.full_name}</h1>
        <p className="text-xs text-foreground/50">BMDC {d.bmdc_number} · {d.specialties.join(" · ")}</p>
        {d.bio && <p className="text-sm text-foreground/70 mt-2">{d.bio}</p>}
      </header>

      <section className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-foreground/10 p-4 bg-foreground/[0.02]">
          <p className="text-xs text-foreground/50 uppercase tracking-wider">যাচাই ফি</p>
          <p className="text-2xl font-bold text-accent">৳{toBangla(d.fee_bdt)}</p>
        </div>
        <div className="rounded-xl border border-foreground/10 p-4 bg-foreground/[0.02]">
          <p className="text-xs text-foreground/50 uppercase tracking-wider">রেটিং</p>
          <p className="text-2xl font-bold">
            {d.rating_count > 0 ? `★ ${(d.rating_avg ?? 0).toFixed(1)}` : "—"}
          </p>
          <p className="text-xs text-foreground/50">
            {toBangla(d.rating_count)} জন রোগী
          </p>
        </div>
      </section>

      {d.qualifications.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">শিক্ষাগত যোগ্যতা</h2>
          <ul className="text-sm text-foreground/80 list-disc pl-5">
            {d.qualifications.map((q, i) => (
              <li key={i}>
                {q.degree} {q.year ? `(${toBangla(q.year)})` : ""}
                {q.institution ? ` — ${q.institution}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.chambers.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">চেম্বার</h2>
          <ul className="text-sm text-foreground/80 space-y-2">
            {d.chambers.map((c, i) => (
              <li key={i} className="border border-foreground/10 rounded-lg px-3 py-2">
                <p className="font-medium">{c.name}</p>
                {c.address && <p className="text-foreground/60">{c.address}</p>}
                {c.hours && <p className="text-foreground/60 text-xs mt-1">⏰ {c.hours}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Request verification CTA */}
      <section className="rounded-2xl border-2 border-accent/30 p-5 bg-accent/[0.04]">
        <h2 className="font-semibold mb-2">আপনার ডকুমেন্ট যাচাই করতে অনুরোধ করুন</h2>
        <p className="text-sm text-foreground/70 mb-4">
          AI-তৈরি কেস সামারিসহ ডাক্তার যাচাই করবেন। সাধারণত ২৪ ঘন্টার মধ্যে।
        </p>
        {docs.length === 0 ? (
          <p className="text-sm text-foreground/60">
            যাচাই করার জন্য প্রথমে একটি ডকুমেন্ট আপলোড করুন।{" "}
            <Link href="/upload" className="text-accent hover:underline">
              আপলোড করুন →
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {docs.slice(0, 5).map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 bg-white/70 dark:bg-white/5 rounded-lg px-3 py-2"
              >
                <span className="text-sm">
                  {kindLabelBn(doc.kind)}
                  {doc.original_name && (
                    <span className="text-foreground/50"> · {doc.original_name}</span>
                  )}
                </span>
                <button
                  disabled={reqLoading}
                  onClick={() => requestVerification(doc.id)}
                  className="px-3 py-1.5 rounded-md bg-accent text-white text-sm disabled:opacity-50"
                >
                  ৳{toBangla(d.fee_bdt)} — অনুরোধ
                </button>
              </li>
            ))}
          </ul>
        )}
        {err && <p className="text-sm text-red-700 mt-3">{err}</p>}
      </section>

      {d.reviews.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">রোগীর পর্যালোচনা</h2>
          <ul className="flex flex-col gap-2">
            {d.reviews.map((r) => (
              <li key={r.id} className="border border-foreground/10 rounded-lg px-3 py-2">
                <p className="text-sm">
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </p>
                {r.text && <p className="text-sm text-foreground/70 mt-1">{r.text}</p>}
                <p className="text-xs text-foreground/50 mt-1">— {r.patient_name}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function kindLabelBn(k: string): string {
  switch (k) {
    case "prescription":
      return "প্রেসক্রিপশন";
    case "lab_report":
      return "ল্যাব রিপোর্ট";
    case "discharge":
      return "ডিসচার্জ সামারি";
    default:
      return "ডকুমেন্ট";
  }
}
