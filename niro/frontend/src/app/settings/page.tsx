"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell/AppShell";
import { apiGet, clearSession, getToken, ApiError, type MeOut } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/signin");
      return;
    }
    apiGet<MeOut>("/me")
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearSession();
          router.replace("/signin");
          return;
        }
        setError(err instanceof ApiError ? `HTTP ${err.status}` : String(err));
      });
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <AlertCircle size={20} />
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 animate-pulse" />
      </div>
    );
  }

  return (
    <AppShell
      user={{ full_name: user.full_name, phone: user.phone }}
      variant={user.role === "doctor" ? "doctor" : "patient"}
    >
      <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">সেটিংস</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">শীঘ্রই আসছে</p>
      </section>
    </AppShell>
  );
}
