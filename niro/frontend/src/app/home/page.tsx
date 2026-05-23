"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  apiGet,
  ApiError,
  loadSession,
  clearSession,
  type DocumentOut,
} from "@/lib/api";
import { timeAgoBn, toBangla } from "@/lib/i18n";

export default function PatientHome() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentOut[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loadSession()) {
      router.replace("/signin");
      return;
    }
    apiGet<DocumentOut[]>("/documents")
      .then(setDocs)
      .catch((e) => setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e)))
      .finally(() => setLoaded(true));
  }, [router]);

  function logout() {
    clearSession();
    router.replace("/");
  }

  return (
    <main className="flex-1 flex flex-col px-6 py-10 max-w-3xl mx-auto w-full gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent">আপনার নিরো</h1>
        <button
          onClick={logout}
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          লগআউট
        </button>
      </header>

      <nav className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/timeline"
          className="px-3 py-1.5 rounded-md border border-foreground/15 hover:bg-foreground/5"
        >
          টাইমলাইন
        </Link>
        <Link
          href="/doctors"
          className="px-3 py-1.5 rounded-md border border-foreground/15 hover:bg-foreground/5"
        >
          ডাক্তার ডিরেক্টরি
        </Link>
        <Link
          href="/verifications"
          className="px-3 py-1.5 rounded-md border border-foreground/15 hover:bg-foreground/5"
        >
          যাচাই অনুরোধ
        </Link>
        <Link
          href="/chamber/scan"
          className="px-3 py-1.5 rounded-md border border-accent/40 bg-accent/[0.05] text-accent hover:bg-accent/10"
        >
          📷 চেম্বার QR স্ক্যান
        </Link>
        <Link
          href="/access-log"
          className="px-3 py-1.5 rounded-md border border-foreground/15 hover:bg-foreground/5"
        >
          অ্যাক্সেস লগ
        </Link>
      </nav>

      <Link
        href="/upload"
        className="rounded-2xl border-2 border-dashed border-accent/40 hover:border-accent bg-accent/[0.04] hover:bg-accent/[0.07] transition px-6 py-8 flex flex-col items-center gap-2 text-center"
      >
        <span className="text-3xl">📄</span>
        <span className="text-lg font-semibold text-accent">
          নতুন প্রেসক্রিপশন / রিপোর্ট আপলোড করুন
        </span>
        <span className="text-sm text-foreground/60">
          AI ৩-৫ সেকেন্ডে বাংলায় বুঝিয়ে দেবে।
        </span>
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">আপনার ডকুমেন্ট</h2>
        {!loaded && <p className="text-sm text-foreground/60">লোড হচ্ছে...</p>}
        {err && <p className="text-sm text-red-700">{err}</p>}
        {loaded && docs.length === 0 && (
          <p className="text-sm text-foreground/60">
            এখনো কোনো ডকুমেন্ট নেই। উপরের বাটনে ট্যাপ করে আপলোড করুন।
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {docs.map((d) => (
            <li
              key={d.id}
              className="border border-foreground/10 rounded-xl px-4 py-3 flex items-center justify-between bg-foreground/[0.02]"
            >
              <div>
                <p className="font-medium">
                  {kindLabelBn(d.kind)}
                  {d.original_name ? (
                    <span className="text-foreground/50 font-normal text-sm">
                      {" "}· {d.original_name}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-foreground/50">
                  {timeAgoBn(d.uploaded_at)} · {toBangla(Math.round(d.size_bytes / 1024))} KB
                </p>
              </div>
              <Link
                href={`/upload?document=${d.id}&kind=${d.kind}`}
                className="text-sm text-accent hover:underline"
              >
                বিশ্লেষণ করুন →
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function kindLabelBn(k: DocumentOut["kind"]): string {
  switch (k) {
    case "prescription":
      return "প্রেসক্রিপশন";
    case "lab_report":
      return "ল্যাব রিপোর্ট";
    case "discharge":
      return "ডিসচার্জ সামারি";
    default:
      return "অন্য ডকুমেন্ট";
  }
}
