"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, ApiError, loadSession, type TimelineEntry } from "@/lib/api";
import { timeAgoBn } from "@/lib/i18n";

export default function TimelinePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loadSession()) {
      router.replace("/signin");
      return;
    }
    apiGet<TimelineEntry[]>("/me/timeline")
      .then(setEntries)
      .catch((e) => setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e)))
      .finally(() => setLoaded(true));
  }, [router]);

  return (
    <main className="flex-1 flex flex-col px-6 py-10 max-w-3xl mx-auto w-full gap-6">
      <Link href="/home" className="text-sm text-foreground/60 hover:text-foreground">
        ← আপনার নিরো
      </Link>
      <h1 className="text-2xl font-bold text-accent">টাইমলাইন</h1>
      {!loaded && <p className="text-sm text-foreground/60">লোড হচ্ছে...</p>}
      {err && <p className="text-sm text-red-700">{err}</p>}
      {loaded && entries.length === 0 && (
        <p className="text-sm text-foreground/60">এখনো কোনো এন্ট্রি নেই।</p>
      )}
      <ol className="flex flex-col gap-3 border-l-2 border-accent/30 ml-3 pl-6">
        {entries.map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[33px] top-1.5 w-3 h-3 rounded-full bg-accent" />
            <div className="rounded-xl border border-foreground/10 px-4 py-3 bg-foreground/[0.02]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-medium">
                  {e.title_bn}
                  {e.doctor_name && (
                    <span className="text-foreground/60 font-normal"> · {e.doctor_name}</span>
                  )}
                </p>
                <span className="text-xs text-foreground/50">{timeAgoBn(e.occurred_at)}</span>
              </div>
              {e.subtitle_bn && (
                <p className="text-sm text-foreground/70 mt-1">{e.subtitle_bn}</p>
              )}
              {e.analysis_id && (
                <Link
                  href={`/analyses/${e.analysis_id}`}
                  className="text-sm text-accent hover:underline inline-block mt-2"
                >
                  বিশ্লেষণ দেখুন →
                </Link>
              )}
              {e.review_id && (
                <span className="inline-block mt-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded">
                  ✓ ডাক্তার পর্যালোচনা
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
