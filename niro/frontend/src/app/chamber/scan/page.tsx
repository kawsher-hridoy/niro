"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadSession } from "@/lib/api";

const NIRO_QR_PREFIX = "niro://chamber/";

export default function PatientScanPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>("ক্যামেরা চালু করা হচ্ছে...");
  const startedRef = useRef(false);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.role !== "patient") {
      setErr("শুধু রোগী অ্যাকাউন্ট QR স্ক্যান করতে পারেন।");
      setInfo(null);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    let stopped = false;
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;

    (async () => {
      try {
        const mod = await import("html5-qrcode");
        const { Html5Qrcode } = mod as typeof import("html5-qrcode");
        const inst = new Html5Qrcode("niro-qr-reader");
        scanner = inst as unknown as typeof scanner;
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decoded) => {
            if (stopped) return;
            const token = parseToken(decoded);
            if (!token) {
              setInfo("ভিন্ন QR — নিরো চেম্বার QR খুঁজছি...");
              return;
            }
            stopped = true;
            inst.stop().catch(() => {});
            router.push(`/chamber/${encodeURIComponent(token)}`);
          },
          () => {
            /* ignore frame-level decoding errors */
          }
        );
        setInfo("ক্যামেরায় চেম্বারের QR কোড দেখান");
      } catch (e) {
        setErr(
          `ক্যামেরা চালু করা যায়নি: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
        setInfo(null);
      }
    })();

    return () => {
      stopped = true;
      if (scanner) {
        try {
          scanner.stop().catch(() => {});
        } catch {
          /* noop */
        }
      }
    };
  }, [router]);

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-8 max-w-md mx-auto w-full gap-4">
      <Link
        href="/home"
        className="self-start text-sm text-foreground/60 hover:text-foreground"
      >
        ← আপনার নিরো
      </Link>
      <h1 className="text-2xl font-bold text-accent">QR স্ক্যান করুন</h1>
      <p className="text-sm text-foreground/70 text-center">
        ডাক্তারের ট্যাবলেট বা মনিটরে প্রদর্শিত নিরো QR কোড স্ক্যান করুন।
      </p>
      <div
        id="niro-qr-reader"
        className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden border-2 border-accent/30 bg-foreground/[0.03]"
      />
      {info && <p className="text-sm text-foreground/60">{info}</p>}
      {err && (
        <div className="w-full">
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {err}
          </p>
          <p className="text-xs text-foreground/50 mt-3">
            টোকেন আপনার কাছে থাকলে নিচে পেস্ট করুন:
          </p>
          <ManualEntry router={router} />
        </div>
      )}
    </main>
  );
}

function parseToken(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.startsWith(NIRO_QR_PREFIX)) {
    return trimmed.slice(NIRO_QR_PREFIX.length);
  }
  // Fallback: accept the bare token if it looks URL-safe.
  if (/^[A-Za-z0-9_\-]{16,}$/.test(trimmed)) return trimmed;
  return null;
}

function ManualEntry({ router }: { router: ReturnType<typeof useRouter> }) {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        placeholder="niro://chamber/... অথবা টোকেন"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="flex-1 border border-foreground/20 rounded-lg px-3 py-2 text-sm"
      />
      <button
        onClick={() => {
          const t = parseToken(v);
          if (t) router.push(`/chamber/${encodeURIComponent(t)}`);
        }}
        className="px-3 py-2 rounded-lg bg-accent text-white text-sm"
      >
        যান
      </button>
    </div>
  );
}
