"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, ApiError, loadSession, type AccessLogEntry } from "@/lib/api";
import { timeAgoBn } from "@/lib/i18n";

export default function AccessLogPage() {
  const router = useRouter();
  const [items, setItems] = useState<AccessLogEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loadSession()) {
      router.replace("/signin");
      return;
    }
    apiGet<AccessLogEntry[]>("/me/access-log")
      .then(setItems)
      .catch((e) => setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e)));
  }, [router]);

  return (
    <main className="flex-1 flex flex-col px-6 py-10 max-w-3xl mx-auto w-full gap-6">
      <Link href="/home" className="text-sm text-foreground/60 hover:text-foreground">
        ← আপনার নিরো
      </Link>
      <h1 className="text-2xl font-bold text-accent">অ্যাক্সেস লগ</h1>
      <p className="text-sm text-foreground/70">
        কোন ডাক্তার কখন আপনার ডেটা দেখেছেন — সব এখানে রেকর্ড থাকে।
      </p>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {items.length === 0 && (
        <p className="text-sm text-foreground/60">এখনো কোনো ডাক্তার আপনার প্রোফাইল দেখেননি।</p>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li
            key={i.id}
            className="border border-foreground/10 rounded-lg px-4 py-3 bg-foreground/[0.02] flex items-center justify-between flex-wrap gap-2"
          >
            <div>
              <p className="font-medium">{i.doctor_name ?? "অজানা"}</p>
              <p className="text-xs text-foreground/60">
                {screenLabelBn(i.screen)}
                {i.location && ` · ${i.location}`}
              </p>
            </div>
            <span className="text-xs text-foreground/50">{timeAgoBn(i.viewed_at)}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

function screenLabelBn(s: string): string {
  switch (s) {
    case "case_summary":
      return "কেস সামারি দেখেছেন";
    case "timeline":
      return "টাইমলাইন দেখেছেন";
    case "document":
      return "ডকুমেন্ট দেখেছেন";
    default:
      return s;
  }
}
