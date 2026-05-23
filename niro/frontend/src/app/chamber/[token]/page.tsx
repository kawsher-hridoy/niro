"use client";

import { use as usePromise, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  apiPost,
  ApiError,
  loadSession,
  type ChamberSessionOut,
} from "@/lib/api";
import { toBangla } from "@/lib/i18n";

type PageProps = { params: Promise<{ token: string }> };

type Scope = "single_document" | "last_3_months" | "full_history";

const SCOPES: Array<{ id: Scope; label_bn: string; hint_bn: string }> = [
  {
    id: "full_history",
    label_bn: "পুরো হিস্ট্রি",
    hint_bn: "সব আপলোড + AI বিশ্লেষণ — ডাক্তার সম্পূর্ণ চিত্র পাবেন।",
  },
  {
    id: "last_3_months",
    label_bn: "গত ৩ মাস",
    hint_bn: "শুধু সাম্প্রতিক ডকুমেন্ট দেখাবে।",
  },
  {
    id: "single_document",
    label_bn: "শুধু একটি ডকুমেন্ট",
    hint_bn: "চেম্বারে শুধু একটি নির্দিষ্ট রিপোর্ট দেখাবেন।",
  },
];

export default function PatientConfirmPage({ params }: PageProps) {
  const { token } = usePromise(params);
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("full_history");
  const [hours, setHours] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [session, setSession] = useState<ChamberSessionOut | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.role !== "patient") {
      setErr("শুধু রোগী অ্যাকাউন্ট QR অনুমোদন করতে পারেন।");
    }
  }, [router]);

  async function approve() {
    setSubmitting(true);
    setErr(null);
    try {
      const s = await apiPost<ChamberSessionOut>(
        `/chamber/session/${encodeURIComponent(token)}/scan`,
        { scope, expires_in_hours: hours }
      );
      setSession(s);
    } catch (e) {
      setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (session) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md flex flex-col gap-4 bg-foreground/[0.02] border border-emerald-200 rounded-2xl p-8 items-center text-center">
          <p className="text-5xl">✓</p>
          <h1 className="text-xl font-bold text-emerald-700">
            অ্যাক্সেস অনুমোদন করা হয়েছে
          </h1>
          <p className="text-sm text-foreground/70">
            ডাক্তার <strong>{session.doctor_name}</strong> এখন আপনার প্রোফাইল
            দেখতে পাবেন।
          </p>
          {session.chamber_address && (
            <p className="text-xs text-foreground/50">📍 {session.chamber_address}</p>
          )}
          <p className="text-xs text-foreground/50">
            মেয়াদ:{" "}
            {session.expires_at
              ? new Date(session.expires_at).toLocaleTimeString("bn-BD")
              : "—"}
          </p>
          <Link
            href="/access-log"
            className="text-sm text-accent hover:underline mt-2"
          >
            অ্যাক্সেস লগ দেখুন →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col gap-5 bg-foreground/[0.02] border border-foreground/10 rounded-2xl p-8">
        <Link
          href="/home"
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← আপনার নিরো
        </Link>
        <h1 className="text-2xl font-bold text-accent">চেম্বারে অ্যাক্সেস</h1>
        <p className="text-sm text-foreground/70">
          ডাক্তারকে আপনার প্রোফাইল দেখানোর আগে অনুমোদন দিন। যেকোনো সময় বাতিল
          করতে পারবেন।
        </p>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
            ডাক্তার কী দেখবেন
          </p>
          {SCOPES.map((s) => (
            <label
              key={s.id}
              className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer ${
                scope === s.id
                  ? "border-accent bg-accent/[0.04]"
                  : "border-foreground/15"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scope"
                  value={s.id}
                  checked={scope === s.id}
                  onChange={() => setScope(s.id)}
                />
                <span className="font-medium">{s.label_bn}</span>
              </span>
              <span className="text-xs text-foreground/60 ml-6">{s.hint_bn}</span>
            </label>
          ))}
        </div>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">
            অ্যাক্সেস কতক্ষণ?: {toBangla(hours)} ঘন্টা
          </span>
          <input
            type="range"
            min={1}
            max={24}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </label>

        {err && <p className="text-sm text-red-700">{err}</p>}

        <button
          onClick={approve}
          disabled={submitting}
          className="px-5 py-3 rounded-lg bg-accent text-white font-medium disabled:opacity-50"
        >
          {submitting ? "অনুমোদন করা হচ্ছে..." : "অনুমোদন করুন"}
        </button>

        <p className="text-xs text-foreground/50 text-center">
          অ্যাক্সেস revoke করতে যেকোনো সময়{" "}
          <Link href="/access-log" className="text-accent">
            অ্যাক্সেস লগ
          </Link>{" "}
          দেখুন।
        </p>
      </div>
    </main>
  );
}
