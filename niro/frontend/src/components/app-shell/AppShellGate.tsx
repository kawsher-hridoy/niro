"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { AppShell } from "./AppShell";
import type { ShellVariant } from "./types";
import {
  apiGet,
  clearSession,
  getToken,
  type DashboardOut,
  type MeOut,
  ApiError,
} from "@/lib/api";

const DashboardContext = createContext<DashboardOut | null>(null);

export function useAppDashboard(): DashboardOut | null {
  return useContext(DashboardContext);
}

export function AppShellGate({
  variant,
  children,
}: {
  variant: ShellVariant;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ full_name: string; phone: string } | null>(null);
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    const token = getToken();
    if (!token) {
      router.replace("/signin");
      return;
    }

    setLoading(true);
    setError(null);
    setUser(null);
    setDashboard(null);

    const load = async () => {
      try {
        if (pathname === "/home") {
          const dash = await apiGet<DashboardOut>("/me/dashboard");
          if (!alive) return;
          setUser({ full_name: dash.user.full_name, phone: dash.user.phone });
          setDashboard(dash);
          return;
        }

        const me = await apiGet<MeOut>("/me");
        if (!alive) return;
        if (variant === "doctor") {
          if (me.role !== "doctor") {
            router.replace("/home");
            return;
          }
          if (me.doctor_verified !== true) {
            router.replace("/doctor-portal/pending");
            return;
          }
          setUser({ full_name: me.full_name, phone: me.phone });
          if (pathname === "/doctor-portal") {
            router.replace("/doctor-portal/dashboard");
            return;
          }
          return;
        }
        if (variant === "patient" && me.role === "doctor") {
          router.replace("/doctor-portal/dashboard");
          return;
        }
        setUser({ full_name: me.full_name, phone: me.phone });
      } catch (err) {
        if (!alive) return;
        if (pathname === "/home" && err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          try {
            const me = await apiGet<MeOut>("/me");
            if (!alive) return;
            if (me.role === "doctor") {
              router.replace(me.doctor_verified === true ? "/doctor-portal/dashboard" : "/doctor-portal/pending");
              return;
            }
          } catch {
            clearSession();
            router.replace("/signin");
            return;
          }
        }
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearSession();
          router.replace("/signin");
          return;
        }
        setError(messageFromError(err));
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [pathname, retry, router, variant]);

  const loadingHome = pathname === "/home";
  if (loading) {
    return <LoadingShell home={loadingHome} />;
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-primary)]">
              <AlertCircle size={20} />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold">লোড করা যায়নি</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{error ?? "সেশন যাচাই করা যায়নি।"}</p>
              <button
                type="button"
                onClick={() => setRetry((n) => n + 1)}
                className="mt-4 inline-flex items-center rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              >
                আবার চেষ্টা করুন
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={dashboard}>
      <AppShell user={user} variant={variant}>
        {children}
      </AppShell>
    </DashboardContext.Provider>
  );
}

function LoadingShell({ home }: { home: boolean }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] md:grid md:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden border-r border-[var(--color-card-border)] bg-[var(--color-card)] md:block">
        <div className="h-full p-6">
          <div className="h-8 w-20 rounded-lg bg-[var(--color-accent-soft)] animate-pulse" />
          <div className="mt-8 space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-11 rounded-lg bg-[var(--color-accent-soft)] animate-pulse" />
            ))}
          </div>
        </div>
      </aside>
      <div className="min-w-0 md:col-start-2">
        <div className="sticky top-0 h-16 border-b border-[var(--color-card-border)] bg-[var(--color-background)]/95 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-6xl items-center px-6">
            <div className="h-10 w-10 rounded-lg bg-[var(--color-accent-soft)] animate-pulse md:hidden" />
            <div className="mx-auto h-5 w-40 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
            <div className="ml-auto h-9 w-9 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
          </div>
        </div>
        <main className="mx-auto max-w-6xl px-6 py-8">
          {home ? <HomeLoading /> : <GenericLoading />}
        </main>
      </div>
    </div>
  );
}

function HomeLoading() {
  return (
    <div className="space-y-8">
      <section className="flex items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="h-8 w-64 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
          <div className="h-5 w-80 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
        </div>
        <div className="hidden h-8 w-40 rounded-full bg-[var(--color-accent-soft)] animate-pulse md:block" />
      </section>
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
            <div className="h-10 w-10 rounded-lg bg-[var(--color-accent-soft)] animate-pulse" />
            <div className="mt-4 h-4 w-20 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
            <div className="mt-2 h-7 w-16 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
          </div>
        ))}
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-32 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
            <div className="h-10 w-10 rounded-lg bg-[var(--color-accent-soft)] animate-pulse" />
            <div className="mt-4 h-5 w-32 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
            <div className="mt-2 h-4 w-48 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
          </div>
        ))}
      </section>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <div className="h-6 w-40 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 rounded-lg bg-[var(--color-accent-soft)] animate-pulse" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
          <div className="h-6 w-36 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 rounded-lg bg-[var(--color-accent-soft)] animate-pulse" />
            ))}
          </div>
        </div>
      </section>
      <section className="mt-8">
        <div className="h-6 w-56 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 rounded-lg bg-[var(--color-accent-soft)] animate-pulse" />
          ))}
        </div>
      </section>
    </div>
  );
}

function GenericLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
      <div className="h-4 w-80 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
      <div className="h-64 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
        <div className="h-6 w-36 rounded-full bg-[var(--color-accent-soft)] animate-pulse" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 rounded-lg bg-[var(--color-accent-soft)] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

function messageFromError(err: unknown): string {
  if (err instanceof ApiError) {
    if (typeof err.body === "object" && err.body && "detail" in err.body) {
      return String((err.body as { detail: unknown }).detail);
    }
    return `HTTP ${err.status}`;
  }
  return String(err);
}
