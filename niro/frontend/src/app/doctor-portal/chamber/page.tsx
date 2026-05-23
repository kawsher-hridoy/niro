"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  apiGet,
  apiPost,
  apiUpload,
  ApiError,
  loadSession,
  type ChamberSessionOut,
  type ChamberProfileOut,
} from "@/lib/api";
import { toBangla } from "@/lib/i18n";

type Phase = "init" | "waiting" | "bound" | "closed";

export default function DoctorChamberPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("init");
  const [session, setSession] = useState<ChamberSessionOut | null>(null);
  const [profile, setProfile] = useState<ChamberProfileOut | null>(null);
  const [chamberAddress, setChamberAddress] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.role !== "doctor") {
      setErr("শুধু ডাক্তার অ্যাকাউন্ট চেম্বার সেশন খুলতে পারেন।");
    }
  }, [router]);

  // Poll for patient scan while in "waiting" phase
  useEffect(() => {
    if (phase !== "waiting" || !session) return;
    const t = setInterval(async () => {
      try {
        const s = await apiGet<ChamberSessionOut>(`/chamber/session/${session.id}`);
        if (s.bound_at) {
          setSession(s);
          setPhase("bound");
          const p = await apiGet<ChamberProfileOut>(
            `/chamber/session/${session.id}/profile`
          );
          setProfile(p);
        }
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [phase, session]);

  async function openSession() {
    setErr(null);
    try {
      const s = await apiPost<ChamberSessionOut>("/chamber/session", {
        chamber_address: chamberAddress || null,
      });
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
      // refresh profile to show new entry
      const p = await apiGet<ChamberProfileOut>(
        `/chamber/session/${session.id}/profile`
      );
      setProfile(p);
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

  // ---------- Render ----------

  if (phase === "init") {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md flex flex-col gap-5 bg-foreground/[0.02] border border-foreground/10 rounded-2xl p-8">
          <Link
            href="/doctor-portal/inbox"
            className="text-sm text-foreground/60 hover:text-foreground"
          >
            ← ইনবক্স
          </Link>
          <h1 className="text-2xl font-bold text-accent">চেম্বার সেশন শুরু</h1>
          <p className="text-sm text-foreground/70">
            চেম্বারে একজন রোগী আপনার সামনে। তাদের সাথে এই QR শেয়ার করে তাদের
            মেডিকেল হিস্ট্রি ৩০ সেকেন্ডে দেখুন।
          </p>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">চেম্বার ঠিকানা (ঐচ্ছিক)</span>
            <input
              type="text"
              value={chamberAddress}
              onChange={(e) => setChamberAddress(e.target.value)}
              placeholder="যেমন: Popular Diagnostic Centre, Dhanmondi"
              className="border border-foreground/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
          {err && <p className="text-sm text-red-700">{err}</p>}
          <button
            onClick={openSession}
            className="px-5 py-3 rounded-lg bg-accent text-white font-medium"
          >
            QR তৈরি করুন
          </button>
        </div>
      </main>
    );
  }

  if (phase === "waiting" && session) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md flex flex-col gap-5 bg-foreground/[0.02] border border-foreground/10 rounded-2xl p-8 items-center text-center">
          <h1 className="text-xl font-bold text-accent">রোগী QR স্ক্যানের অপেক্ষায়</h1>
          <p className="text-sm text-foreground/70">
            রোগী তাদের নিরো অ্যাপ থেকে এই QR স্ক্যান করবেন।
          </p>
          <div className="bg-white p-4 rounded-xl border border-foreground/10">
            <QRCodeSVG value={session.qr_payload} size={240} level="M" />
          </div>
          <code className="text-xs text-foreground/50 break-all">
            {session.qr_payload}
          </code>
          <p className="text-xs text-foreground/50">
            সেশনের মেয়াদ:{" "}
            {new Date(session.expires_at).toLocaleTimeString("bn-BD")}
          </p>
          <button
            onClick={closeSession}
            className="text-sm text-foreground/60 hover:text-foreground"
          >
            সেশন বাতিল করুন
          </button>
          {err && <p className="text-sm text-red-700">{err}</p>}
        </div>
      </main>
    );
  }

  if (phase === "bound" && session && profile) {
    return (
      <main className="flex-1 flex flex-col px-6 py-8 max-w-3xl mx-auto w-full gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground/50">চেম্বার সেশন চলমান</p>
            <h1 className="text-2xl font-bold">{profile.patient_name}</h1>
            {session.chamber_address && (
              <p className="text-xs text-foreground/50">📍 {session.chamber_address}</p>
            )}
          </div>
          <button
            onClick={closeSession}
            className="text-sm bg-foreground/[0.05] hover:bg-foreground/10 rounded-lg px-3 py-2"
          >
            সেশন শেষ করুন
          </button>
        </div>

        {profile.latest_analysis && (
          <section className="rounded-2xl border-2 border-accent/30 p-5 bg-accent/[0.04]">
            <h2 className="font-semibold mb-2 text-accent">সর্বশেষ AI বিশ্লেষণ</h2>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {profile.latest_analysis.explanation_bn}
            </p>
            {profile.latest_analysis.red_flags.length > 0 && (
              <ul className="text-sm mt-3 flex flex-wrap gap-2">
                {profile.latest_analysis.red_flags.map((rf, i) => (
                  <li
                    key={i}
                    className={`px-2 py-1 rounded border ${
                      rf.severity === "danger"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : rf.severity === "warn"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-sky-50 text-sky-700 border-sky-200"
                    }`}
                  >
                    ⚠ {rf.label_bn}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-foreground/50 mt-3">
              AI confidence:{" "}
              {toBangla(Math.round(profile.latest_analysis.confidence * 100))}%
            </p>
          </section>
        )}

        <section>
          <h2 className="font-semibold mb-2">টাইমলাইন ({toBangla(profile.timeline.length)})</h2>
          {profile.timeline.length === 0 ? (
            <p className="text-sm text-foreground/60">এই রোগীর এখনো কোনো এন্ট্রি নেই।</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {profile.timeline.slice(0, 10).map((t) => (
                <li
                  key={`${t.kind}-${t.id}`}
                  className="border border-foreground/10 rounded-lg px-3 py-2 bg-foreground/[0.02]"
                >
                  <p className="text-sm font-medium">{t.title_bn}</p>
                  {t.preview_bn && (
                    <p className="text-xs text-foreground/60 mt-1 line-clamp-2">
                      {t.preview_bn}
                    </p>
                  )}
                  <p className="text-xs text-foreground/40 mt-1">
                    {new Date(t.occurred_at).toLocaleString("bn-BD")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-foreground/10 p-5 bg-foreground/[0.02]">
          <h2 className="font-semibold mb-2">নতুন প্রেসক্রিপশন যোগ করুন</h2>
          <p className="text-sm text-foreground/70 mb-3">
            ফাইলটি সরাসরি রোগীর প্রোফাইলে যুক্ত হবে।
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          {file && (
            <p className="text-xs text-foreground/60 mt-1">
              {file.name} · {Math.round(file.size / 1024)} KB
            </p>
          )}
          <button
            onClick={writePrescription}
            disabled={!file || uploading}
            className="mt-3 px-5 py-2 rounded-lg bg-accent text-white text-sm disabled:opacity-50"
          >
            {uploading ? "আপলোড করা হচ্ছে..." : "যোগ করুন"}
          </button>
          {err && <p className="text-sm text-red-700 mt-3">{err}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-accent mb-2">সেশন শেষ</h1>
        <p className="text-sm text-foreground/70 mb-4">
          চেম্বার সেশনটি বন্ধ করা হয়েছে। রোগীর অ্যাক্সেস revoke করা হয়েছে।
        </p>
        <Link
          href="/doctor-portal/inbox"
          className="text-accent hover:underline"
        >
          ইনবক্সে ফিরে যান →
        </Link>
      </div>
    </main>
  );
}
