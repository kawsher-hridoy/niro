"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost, ApiError, saveSession, type Session } from "@/lib/api";

function VerifyForm() {
  const params = useSearchParams();
  const router = useRouter();
  const phone = params.get("phone") ?? "";
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!phone) router.replace("/signin");
  }, [phone, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const session = await apiPost<Session>(
        "/auth/otp/verify",
        { phone, code, full_name: name || undefined },
        { auth: false }
      );
      saveSession(session);
      router.replace("/home");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? typeof e.body === "object" && e.body && "detail" in e.body
            ? String((e.body as { detail: unknown }).detail)
            : JSON.stringify(e.body)
          : String(e);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <form
        onSubmit={submit}
        className="w-full max-w-md flex flex-col gap-5 bg-foreground/[0.02] border border-foreground/10 rounded-2xl p-8"
      >
        <h1 className="text-2xl font-bold text-accent">OTP যাচাই</h1>
        <p className="text-sm text-foreground/70">
          আমরা <strong>{phone}</strong> নম্বরে একটি কোড পাঠিয়েছি।
        </p>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">৬-সংখ্যার কোড</span>
          <input
            type="text"
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            maxLength={6}
            className="border border-foreground/20 rounded-lg px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">আপনার নাম (ঐচ্ছিক)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="যেমন: রহিমা বেগম"
            className="border border-foreground/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>

        {err && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="px-5 py-3 rounded-lg bg-accent text-white font-medium disabled:opacity-50"
        >
          {loading ? "যাচাই করা হচ্ছে..." : "যাচাই করুন"}
        </button>
      </form>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <VerifyForm />
    </Suspense>
  );
}
