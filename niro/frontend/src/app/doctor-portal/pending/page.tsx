"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, ApiError, clearSession, type MeOut } from "@/lib/api";

export default function DoctorPendingPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<MeOut>("/me")
      .then((me) => {
        setUser(me);
        if (me.role !== "doctor") {
          router.replace("/home");
          return;
        }
        if (me.doctor_verified) {
          router.replace("/doctor-portal/dashboard");
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearSession();
          router.replace("/signin");
          return;
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !user) {
    return <div className="mx-auto max-w-2xl rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 animate-pulse" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-primary)]">
          <AlertCircle size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">আবেদন প্রক্রিয়াধীন</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            ডা. {user.full_name} এর অ্যাকাউন্ট এখনও যাচাই হয়নি। BMDC ও প্রোফাইল যাচাই শেষ হলে আপনি ড্যাশবোর্ড পাবেন।
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="ফোন" value={user.phone} />
        <Info label="স্ট্যাটাস" value="Pending review" />
        {user.doctor_bmdc_number && <Info label="BMDC" value={user.doctor_bmdc_number} />}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          আবার যাচাই করুন
        </button>
        <button
          type="button"
          onClick={() => {
            clearSession();
            router.replace("/signin");
          }}
          className="rounded-lg border border-[var(--color-card-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          সাইন আউট
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-background)] px-4 py-3"><p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">{label}</p><p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">{value}</p></div>;
}
