"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiUpload, ApiError, type ChamberProfileOut, type ChamberSessionOut } from "@/lib/api";
import { toBangla } from "@/lib/i18n";

type Phase = "init" | "waiting" | "bound" | "closed";

export default function DoctorChamberPage() {
  const [phase, setPhase] = useState<Phase>("init");
  const [session, setSession] = useState<ChamberSessionOut | null>(null);
  const [profile, setProfile] = useState<ChamberProfileOut | null>(null);
  const [chamberAddress, setChamberAddress] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (phase !== "waiting" || !session) return;
    const t = setInterval(async () => {
      try {
        const s = await apiGet<ChamberSessionOut>(`/chamber/session/${session.id}`);
        if (s.bound_at) {
          setSession(s);
          setPhase("bound");
          const p = await apiGet<ChamberProfileOut>(`/chamber/session/${session.id}/profile`);
          setProfile(p);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(t);
  }, [phase, session]);

  async function openSession() {
    setErr(null);
    try {
      const s = await apiPost<ChamberSessionOut>("/chamber/session", { chamber_address: chamberAddress || null });
      setSession(s);
      setPhase("waiting");
    } catch (e) {
      setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
    }
  }

  async function writePrescription() {
    if (!file || !session) return;
    setUploading(true);
    setErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "prescription");
      await apiUpload(`/chamber/session/${session.id}/prescription`, form);
      setProfile(await apiGet<ChamberProfileOut>(`/chamber/session/${session.id}/profile`));
      setFile(null);
    } catch (e) {
      setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function closeSession() {
    if (!session) return;
    try {
      await apiPost(`/chamber/session/${session.id}/close`, {});
      setPhase("closed");
    } catch (e) {
      setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
    }
  }

  if (phase === "init") {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 space-y-5">
        <header>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">চেম্বার সেশন শুরু</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">রোগী QR স্ক্যান করলে তাৎক্ষণিক অ্যাক্সেস খুলবে।</p>
        </header>
        <label className="flex flex-col gap-2 text-sm"><span className="font-medium">চেম্বার ঠিকানা (ঐচ্ছিক)</span><input value={chamberAddress} onChange={(e) => setChamberAddress(e.target.value)} className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-background)] px-3 py-2" /></label>
        {err && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <button onClick={openSession} className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white">QR তৈরি করুন</button>
        <Link href="/doctor-portal/inbox" className="inline-flex text-sm font-medium text-[var(--color-primary)] hover:underline">← ইনবক্স</Link>
      </div>
    );
  }

  if (phase === "waiting" && session) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 text-center space-y-4">
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">রোগী QR স্ক্যানের অপেক্ষায়</h1>
        <div className="mx-auto w-fit rounded-xl border border-[var(--color-card-border)] bg-white p-4"><QRCodeSVG value={session.qr_payload} size={240} level="M" /></div>
        <p className="text-xs text-[var(--color-muted)] break-all">{session.qr_payload}</p>
        <p className="text-xs text-[var(--color-muted)]">সেশনের মেয়াদ: {new Date(session.expires_at).toLocaleTimeString("bn-BD")}</p>
        <button onClick={closeSession} className="text-sm font-medium text-[var(--color-primary)] hover:underline">সেশন বাতিল করুন</button>
        {err && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </div>
    );
  }

  if (phase === "bound" && session && profile) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--color-muted)]">চেম্বার সেশন চলমান</p>
            <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{profile.patient_name}</h1>
          </div>
          <button onClick={closeSession} className="rounded-lg border border-[var(--color-card-border)] px-3 py-2 text-sm hover:bg-[var(--color-background)]">সেশন শেষ করুন</button>
        </div>

        {profile.latest_analysis && <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"><h2 className="font-semibold">সর্বশেষ AI বিশ্লেষণ</h2><p className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-muted)]">{profile.latest_analysis.explanation_bn}</p><p className="mt-2 text-xs text-[var(--color-muted)]">AI confidence: {toBangla(Math.round(profile.latest_analysis.confidence * 100))}%</p></section>}

        <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">টাইমলাইন ({toBangla(profile.timeline.length)})</h2>
          {profile.timeline.length === 0 ? <p className="mt-3 text-sm text-[var(--color-muted)]">এই রোগীর এখনো কোনো এন্ট্রি নেই।</p> : <div className="mt-3 space-y-2">{profile.timeline.slice(0, 10).map((t) => <article key={`${t.kind}-${t.id}`} className="rounded-lg border border-[var(--color-card-border)] px-3 py-2"><p className="text-sm font-medium text-[var(--color-foreground)]">{t.title_bn}</p>{t.preview_bn && <p className="mt-1 text-xs text-[var(--color-muted)]">{t.preview_bn}</p>}</article>)}</div>}
        </section>

        <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">নতুন প্রেসক্রিপশন যোগ করুন</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">ফাইলটি রোগীর প্রোফাইলে যুক্ত হবে।</p>
          <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-3 text-sm" />
          {file && <p className="mt-1 text-xs text-[var(--color-muted)]">{file.name} · {Math.round(file.size / 1024)} KB</p>}
          <button onClick={writePrescription} disabled={!file || uploading} className="mt-3 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{uploading ? "আপলোড করা হচ্ছে..." : "যোগ করুন"}</button>
          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 text-center space-y-4">
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">সেশন শেষ</h1>
      <p className="text-sm text-[var(--color-muted)]">চেম্বার সেশনটি বন্ধ করা হয়েছে।</p>
      <Link href="/doctor-portal/inbox" className="inline-flex text-sm font-medium text-[var(--color-primary)] hover:underline">ইনবক্সে ফিরে যান →</Link>
    </div>
  );
}
