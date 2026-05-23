"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, ApiError, loadSession, type VerificationOut } from "@/lib/api";
import { toBangla, timeAgoBn } from "@/lib/i18n";

const DISPOSITION_BN: Record<string, string> = {
  agree: "AI-এর সাথে একমত",
  concerns: "কিছু আপত্তি আছে",
  escalate: "আরও বিশেষজ্ঞ লাগবে",
};

export default function VerificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<VerificationOut[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loadSession()) {
      router.replace("/signin");
      return;
    }
    apiGet<VerificationOut[]>("/verifications")
      .then(setItems)
      .catch((e) => setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e)));
  }, [router]);

  return (
    <main className="flex-1 flex flex-col px-6 py-10 max-w-3xl mx-auto w-full gap-6">
      <Link href="/home" className="text-sm text-foreground/60 hover:text-foreground">
        ← আপনার নিরো
      </Link>
      <h1 className="text-2xl font-bold text-accent">যাচাই অনুরোধ</h1>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {items.length === 0 && (
        <p className="text-sm text-foreground/60">
          এখনো কোনো অনুরোধ নেই।{" "}
          <Link href="/doctors" className="text-accent hover:underline">
            ডাক্তার ডিরেক্টরি থেকে শুরু করুন →
          </Link>
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {items.map((v) => (
          <li
            key={v.id}
            className="rounded-xl border border-foreground/10 px-4 py-3 bg-foreground/[0.02]"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-medium">{v.doctor_name}</p>
              <StatusChip v={v} />
            </div>
            <p className="text-xs text-foreground/50 mt-1">
              ৳{toBangla(v.fee_bdt)} · {timeAgoBn(v.created_at)}
            </p>
            {v.review_disposition && (
              <p className="text-sm text-emerald-700 mt-2">
                ✓ {DISPOSITION_BN[v.review_disposition] ?? v.review_disposition}
              </p>
            )}
            <Link
              href={`/verifications/${v.id}`}
              className="text-sm text-accent hover:underline mt-2 inline-block"
            >
              বিস্তারিত →
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function StatusChip({ v }: { v: VerificationOut }) {
  if (v.review_id) {
    return (
      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full">
        সম্পন্ন
      </span>
    );
  }
  if (v.payment_status === "paid") {
    return (
      <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2 py-1 rounded-full">
        ডাক্তারের পর্যালোচনা চলছে
      </span>
    );
  }
  return (
    <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-full">
      পেমেন্ট pending
    </span>
  );
}
