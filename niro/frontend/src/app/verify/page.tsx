"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, parseAuthError, saveSession } from "@/lib/api";

function VerifyForm() {
  const params = useSearchParams();
  const router = useRouter();
  const phone = params.get("phone") ?? "";
  const signupToken = params.get("signup_token");
  const resetToken = params.get("reset_token");
  const mode: "signup" | "reset" | "legacy" = signupToken
    ? "signup"
    : resetToken
      ? "reset"
      : "legacy";

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (mode === "legacy" && !phone) router.replace("/signin");
  }, [mode, phone, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    setLoading(true);
    try {
      if (mode === "signup" && signupToken) {
        const session = await authApi.signupVerify({
          signup_token: signupToken,
          code,
        });
        saveSession(session);
        router.replace(session.role === "doctor" ? "/doctor-portal/dashboard" : "/home");
      } else if (mode === "reset") {
        const session = await authApi.resetConfirm({
          phone,
          code,
          new_password: newPassword,
        });
        saveSession(session);
        router.replace(session.role === "doctor" ? "/doctor-portal/dashboard" : "/home");
      } else {
        const session = await authApi.loginOtpVerify(phone, code, name || undefined);
        saveSession(session);
        router.replace(session.role === "doctor" ? "/doctor-portal/dashboard" : "/home");
      }
    } catch (err) {
      setTopError(parseAuthError(err).detail);
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (cooldown > 0) return;
    setResending(true);
    setTopError(null);
    try {
      if (mode === "signup" && signupToken) {
        await authApi.signupResendOtp(signupToken);
      } else if (mode === "reset") {
        await authApi.resetStart(phone);
      } else {
        await authApi.loginOtpRequest(phone);
      }
      setCooldown(30);
    } catch (err) {
      setTopError(parseAuthError(err).detail);
    } finally {
      setResending(false);
    }
  }

  const title =
    mode === "signup"
      ? "অ্যাকাউন্ট যাচাই"
      : mode === "reset"
        ? "নতুন পাসওয়ার্ড সেট করুন"
        : "OTP যাচাই";

  const subtitle =
    mode === "signup"
      ? "আপনার ফোনে পাঠানো ৬-সংখ্যার কোড দিন।"
      : mode === "reset"
        ? "OTP দিন এবং নতুন পাসওয়ার্ড সেট করুন।"
        : "আমরা একটি কোড পাঠিয়েছি।";

  const isDev =
    typeof process !== "undefined" && process.env.NODE_ENV !== "production";

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <a
            href="/"
            className="text-2xl font-bold tracking-tight text-[var(--color-primary)]"
          >
            নিরো
          </a>
        </div>
        <form
          onSubmit={submit}
          className="bg-[var(--color-card)] border border-[var(--color-card-border)] rounded-xl shadow-sm p-8 flex flex-col gap-4"
        >
          <div>
            <h1 className="text-xl font-bold text-[var(--color-foreground)]">{title}</h1>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              {subtitle}
              {phone && (
                <>
                  {" "}
                  <span className="font-medium text-[var(--color-foreground)]">{phone}</span>
                </>
              )}
            </p>
          </div>

          {topError && (
            <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
              {topError}
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-foreground)]">৬-সংখ্যার কোড</span>
            <input
              type="text"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              maxLength={6}
              autoComplete="one-time-code"
              className="border border-[var(--color-card-border)] rounded-lg px-4 py-3 bg-[var(--color-background)] text-2xl text-center tracking-widest text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            />
          </label>

          {mode === "reset" && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--color-foreground)]">নতুন পাসওয়ার্ড</span>
              <div className="relative">
                <input
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full border border-[var(--color-card-border)] rounded-lg px-4 py-2.5 pr-12 bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd((s) => !s)}
                  className="absolute inset-y-0 right-2 px-2 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-primary)]"
                >
                  {showNewPwd ? "লুকান" : "দেখান"}
                </button>
              </div>
              <span className="text-xs text-[var(--color-muted)]">
                কমপক্ষে ৮ অক্ষর — অন্তত একটি অক্ষর এবং একটি সংখ্যা।
              </span>
            </label>
          )}

          {mode === "legacy" && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--color-foreground)]">আপনার নাম (ঐচ্ছিক)</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: রহিমা বেগম"
                className="border border-[var(--color-card-border)] rounded-lg px-4 py-2.5 bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 6 || (mode === "reset" && newPassword.length < 8)}
            className="mt-2 px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-hover)] transition focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "অপেক্ষা করুন…" : mode === "reset" ? "পাসওয়ার্ড সেট করুন" : "যাচাই করুন"}
          </button>

          <button
            type="button"
            onClick={resendOtp}
            disabled={resending || cooldown > 0}
            className="text-sm text-[var(--color-primary)] hover:underline disabled:no-underline disabled:text-[var(--color-muted)] disabled:cursor-not-allowed"
          >
            {cooldown > 0
              ? `OTP আবার পাঠান (${cooldown}s)`
              : resending
                ? "পাঠানো হচ্ছে…"
                : "OTP আবার পাঠান"}
          </button>

          {isDev && (
            <p className="text-xs text-[var(--color-muted)] text-center mt-1">
              ডেভ এনভায়রনমেন্টে OTP কোড সর্বদা <strong>123456</strong> থাকে।
            </p>
          )}
        </form>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--color-muted)]">লোড হচ্ছে…</div>}>
      <VerifyForm />
    </Suspense>
  );
}
