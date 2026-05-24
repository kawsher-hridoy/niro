"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  QrCode,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { useAppDashboard } from "@/components/app-shell/AppShellGate";
import type { DashboardOut, DocumentOut } from "@/lib/api";
import { timeAgoBn, toBangla } from "@/lib/i18n";

export default function PatientHome() {
  const dashboard = useAppDashboard();

  if (!dashboard) {
    return null;
  }

  const firstName = firstNameOf(dashboard.user.full_name);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-foreground)]">
            নমস্কার, {firstName}
          </h1>
          <p className="mt-1 text-base text-[var(--color-muted)]">
            আজ আপনার স্বাস্থ্যের সংক্ষিপ্ত চিত্র।
          </p>
        </div>
        <div className="inline-flex w-fit rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-4 py-2 text-sm text-[var(--color-muted)]">
          {todayBn()}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={<FileText size={22} />} label="ডকুমেন্ট" value={dashboard.counts.documents} />
        <StatCard icon={<Sparkles size={22} />} label="AI বিশ্লেষণ" value={dashboard.counts.analyses} />
        <StatCard icon={<BadgeCheck size={22} />} label="যাচাই" value={dashboard.counts.verifications} />
        <StatCard icon={<ShieldCheck size={22} />} label="সক্রিয় অনুমতি" value={dashboard.counts.active_consents} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickAction
          icon={<Upload size={22} />}
          title="নতুন ডকুমেন্ট আপলোড"
          description="প্রেসক্রিপশন বা রিপোর্ট AI বিশ্লেষণের জন্য"
          href="/upload"
        />
        <QuickAction
          icon={<Stethoscope size={22} />}
          title="ডাক্তার খুঁজুন"
          description="বিশেষজ্ঞ ডাক্তারের কাছে যাচাই করান"
          href="/doctors"
        />
        <QuickAction
          icon={<QrCode size={22} />}
          title="চেম্বার সংযোগ"
          description="চেম্বার QR স্ক্যান করে শেয়ার করুন"
          href="/chamber/scan"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentDocuments dashboard={dashboard} />
        <RecentInsights dashboard={dashboard} />
      </section>

      <RecentAccess dashboard={dashboard} />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-primary)]">
        {icon}
      </div>
      <p className="mt-4 text-sm text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">
        {toBangla(value)}
      </p>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  description,
  href,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-primary)]">
        {icon}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h2>
        <ArrowRight size={17} className="text-[var(--color-primary)] transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
    </Link>
  );
}

function RecentDocuments({ dashboard }: { dashboard: DashboardOut }) {
  return (
    <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 lg:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">সাম্প্রতিক ডকুমেন্ট</h2>
        <Link
          href="/timeline?type=document"
          className="text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-sm"
        >
          সব দেখুন →
        </Link>
      </div>

      {dashboard.recent_documents.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          title="এখনো কোনো ডকুমেন্ট নেই।"
          body="আপনার প্রথম প্রেসক্রিপশন বা রিপোর্ট আপলোড করুন।"
          cta={{ label: "আপলোড করুন", href: "/upload" }}
        />
      ) : (
        <div className="mt-5 divide-y divide-[var(--color-card-border)]">
          {dashboard.recent_documents.map((doc) => (
            <div key={doc.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-primary)]">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-foreground)]">{kindLabelBn(doc.kind)}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)]">{timeAgoBn(doc.uploaded_at)}</p>
                </div>
              </div>
              <Link
                href={doc.analysis_id ? `/analyses/${doc.analysis_id}` : `/upload?document=${doc.id}&kind=${doc.kind}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-sm"
              >
                {doc.analysis_id ? "বিশ্লেষণ দেখুন" : "বিশ্লেষণ করুন"}
                <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentInsights({ dashboard }: { dashboard: DashboardOut }) {
  return (
    <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">AI যা পেয়েছে</h2>
        <Link
          href="/timeline?type=analysis"
          className="text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-sm"
        >
          সব দেখুন →
        </Link>
      </div>

      {dashboard.recent_analyses.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={32} />}
          title="এখনো AI বিশ্লেষণ নেই।"
          body="ডকুমেন্ট আপলোড করলে এখানে সারাংশ দেখা যাবে।"
          cta={{ label: "আপলোড করুন", href: "/upload" }}
        />
      ) : (
        <div className="mt-5 space-y-4">
          {dashboard.recent_analyses.map((analysis) => (
            <Link
              key={analysis.id}
              href={`/analyses/${analysis.id}`}
              className="block rounded-lg border border-[var(--color-card-border)] p-3 transition hover:bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex min-w-9 justify-center rounded-full px-2 py-1 text-xs font-medium ${analysis.red_flag_count > 0 ? "border border-red-200 bg-red-50 text-red-700" : "bg-[var(--color-accent-soft)] text-[var(--color-primary)]"}`}>
                  {toBangla(analysis.red_flag_count)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--color-foreground)]">{truncateBn(analysis.summary_bn, 60)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                    <span>{timeAgoBn(analysis.created_at)}</span>
                    {analysis.recommend_human_review && (
                      <span className="rounded-full bg-[var(--color-amber-soft)] px-2 py-1 font-medium text-amber-800">
                        ডাক্তার পরামর্শ নিন
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
          <p className="text-xs text-[var(--color-muted)]">AI সারাংশ চিকিৎসকের পরামর্শ নয়।</p>
        </div>
      )}
    </div>
  );
}

function RecentAccess({ dashboard }: { dashboard: DashboardOut }) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">ডাক্তারের প্রবেশের রেকর্ড</h2>
          <p className="text-sm text-[var(--color-muted)]">
            শেষ ৩০ দিনে {toBangla(dashboard.counts.doctor_views_30d)} বার দেখা হয়েছে।
          </p>
        </div>
        <Link
          href="/access-log"
          className="text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-sm"
        >
          সব →
        </Link>
      </div>

      {dashboard.recent_access.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-muted)]">এখনো কেউ আপনার প্রোফাইল দেখেনি।</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {dashboard.recent_access.map((item, index) => (
            <div key={`${item.viewed_at}-${index}`} className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-4 py-3">
              <p className="font-medium text-[var(--color-foreground)]">{item.doctor_name ?? "অজানা ডাক্তার"}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{screenLabelBn(item.screen)} · {timeAgoBn(item.viewed_at)}</p>
              <span className="mt-3 inline-flex rounded-full bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-medium text-[var(--color-primary)]">
                {item.context === "chamber" ? "চেম্বার" : "অনলাইন"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "আপনি";
}

function todayBn(): string {
  return toBangla(
    new Intl.DateTimeFormat("bn-BD", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date())
  );
}

function kindLabelBn(kind: DocumentOut["kind"]): string {
  switch (kind) {
    case "prescription":
      return "প্রেসক্রিপশন";
    case "lab_report":
      return "ল্যাব রিপোর্ট";
    case "discharge":
      return "ডিসচার্জ সামারি";
    default:
      return "অন্য ডকুমেন্ট";
  }
}

function screenLabelBn(screen: string): string {
  switch (screen) {
    case "case_summary":
      return "কেস সামারি";
    case "timeline":
      return "টাইমলাইন";
    case "document":
      return "ডকুমেন্ট";
    default:
      return screen;
  }
}

function truncateBn(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
