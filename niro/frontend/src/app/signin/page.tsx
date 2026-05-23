"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, ApiError } from "@/lib/api";

export default function SignIn() {
  const [phone, setPhone] = useState("+8801");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await apiPost<{ ok: boolean; dev_hint?: string }>(
        "/auth/otp/request",
        { phone },
        { auth: false }
      );
      router.push(`/verify?phone=${encodeURIComponent(phone)}`);
    } catch (e) {
      const msg = e instanceof ApiError ? JSON.stringify(e.body) : String(e);
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
        <h1 className="text-2xl font-bold text-accent">সাইন ইন</h1>
        <p className="text-sm text-foreground/70">
          আপনার মোবাইল নম্বর দিন। আমরা একটি OTP কোড পাঠাব।
        </p>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">ফোন নম্বর</span>
          <input
            type="tel"
            inputMode="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+8801XXXXXXXXX"
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
          disabled={loading}
          className="px-5 py-3 rounded-lg bg-accent text-white font-medium disabled:opacity-50"
        >
          {loading ? "পাঠানো হচ্ছে..." : "OTP পাঠান"}
        </button>

        <p className="text-xs text-foreground/50">
          ডেভ এনভায়রনমেন্টে OTP কোড সর্বদা <strong>123456</strong> থাকে।
        </p>
      </form>
    </main>
  );
}
