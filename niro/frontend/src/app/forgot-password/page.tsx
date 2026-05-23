"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, parseAuthError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("+8801");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const out = await authApi.resetStart(phone);
      router.push(
        `/verify?reset_token=${encodeURIComponent(out.reset_token)}&phone=${encodeURIComponent(phone)}`
      );
    } catch (err) {
      setError(parseAuthError(err).detail);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-[var(--color-primary)]"
          >
            নিরো
          </Link>
        </div>
        <form
          onSubmit={submit}
          className="bg-[var(--color-card)] border border-[var(--color-card-border)] rounded-xl shadow-sm p-8 flex flex-col gap-4"
        >
          <div>
            <h1 className="text-xl font-bold text-[var(--color-foreground)]">
              পাসওয়ার্ড রিসেট
            </h1>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              আপনার ফোন নম্বরে একটি OTP কোড পাঠানো হবে।
            </p>
          </div>

          {error && (
            <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-foreground)]">ফোন নম্বর</span>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+8801XXXXXXXXX"
              autoComplete="tel"
              required
              className="border border-[var(--color-card-border)] rounded-lg px-4 py-2.5 bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-hover)] transition focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "অপেক্ষা করুন…" : "OTP পাঠান"}
          </button>

          <Link
            href="/signin"
            className="text-center text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
          >
            ← সাইন ইন পেজে ফিরে যান
          </Link>
        </form>
      </div>
    </main>
  );
}
