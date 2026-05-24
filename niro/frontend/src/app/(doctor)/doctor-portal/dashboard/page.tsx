"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, LayoutDashboard, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, ApiError, type DoctorDashboardOut } from "@/lib/api";
import { timeAgoBn, toBangla } from "@/lib/i18n";

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DoctorDashboardOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    apiGet<DoctorDashboardOut>("/doctor/dashboard")
      .then((out) => {
        if (alive) setData(out);
      })
      .catch((e) => {
        if (alive) {
          if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
            router.replace("/doctor-portal/pending");
            return;
          }
          setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e));
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [router, retryTick]);

  if (loading) return <DashboardSkeleton />;
  if (err || !data) {
    return <InlineError message={err ?? "ড্যাশবোর্ড লোড করা যায়নি।"} onRetry={() => setRetryTick((v) => v + 1)} />;
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <BadgeCheck size={14} /> Verified doctor
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)]">নমস্কার, {firstName(data.user.full_name)}</h1>
          <p className="mt-1 text-base text-[var(--color-muted)]">আজকের ডাক্তার-ওয়ার্কফ্লো এক নজরে দেখুন।</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-4 py-2 text-sm text-[var(--color-muted)]">
            {toBangla(new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", year: "numeric" }).format(new Date()))}
          </span>
          <Link href="/doctor-portal/inbox" className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2">
            ইনবক্স দেখুন <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard icon={<Sparkles size={20} />} label="অপেক্ষমাণ" value={data.counts.pending_reviews} />
        <StatCard icon={<Clock3 size={20} />} label="দুয়ার ভিতরে" value={data.counts.due_soon} />
        <StatCard icon={<BadgeCheck size={20} />} label="আজ সম্পন্ন" value={data.counts.completed_today} />
        <StatCard icon={<LayoutDashboard size={20} />} label="চেম্বার চলমান" value={data.counts.active_chamber_sessions} />
        <StatCard icon={<ShieldCheck size={20} />} label="সাম্প্রতিক অ্যাক্সেস" value={data.counts.recent_patient_access} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="জরুরি রিভিউ" href="/doctor-portal/inbox" action="সব দেখুন">
          {data.urgent_reviews.length === 0 ? <EmptyLine text="এখনো কোনো অপেক্ষমাণ কেস নেই।" /> : data.urgent_reviews.map((item) => <WorkRow key={item.request_id} title={item.patient_name} meta={`${item.document_kind} · ৳${toBangla(item.fee_bdt)} · ${timeAgoBn(item.due_by)}`} href={`/doctor-portal/cases/${item.request_id}`} action={item.has_review ? "দেখুন" : "খুলুন"} />)}
        </Panel>
        <Panel title="সম্পন্ন কেস" href="/doctor-portal/inbox" action="ইনবক্স">
          {data.completed_reviews.length === 0 ? <EmptyLine text="আজ কোনো রিভিউ জমা হয়নি।" /> : data.completed_reviews.map((item) => <CompactPill key={item.request_id} title={item.patient_name} meta={`${item.disposition} · ${timeAgoBn(item.submitted_at)}`} />)}
        </Panel>
        <Panel title="চেম্বার স্ট্যাটাস" href="/doctor-portal/chamber" action="চালু করুন">
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-background)] px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">প্রোফাইল</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">{data.profile.bmdc_number}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{data.profile.specialties.slice(0, 3).join(" · ")}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-background)] px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">রেটিং</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">{data.rating_count > 0 ? `${data.rating_avg?.toFixed(1)} ★` : "এখনো রেটিং নেই"}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{toBangla(data.rating_count)} পর্যালোচনা</p>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="সাম্প্রতিক patient access" href="/access-log" action="সব দেখুন">
          {data.recent_access.length === 0 ? <EmptyLine text="এখনো কোনো patient access নেই।" /> : data.recent_access.map((item, index) => <AccessRow key={`${item.viewed_at}-${index}`} item={item} />)}
        </Panel>
        <Panel title="দ্রুত কাজ" action="">
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickCard title="ইনবক্স" body="নতুন verification কেস দেখুন" href="/doctor-portal/inbox" />
            <QuickCard title="চেম্বার" body="QR session চালু করুন" href="/doctor-portal/chamber" />
            <QuickCard title="প্রোফাইল" body="সেটিংস ও বিবরণ দেখুন" href="/settings" />
            <QuickCard title="রিভিউ" body="সমাপ্ত কেসগুলো স্ক্যান করুন" href="/doctor-portal/inbox" />
          </div>
        </Panel>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-primary)]">{icon}</div><p className="mt-4 text-sm text-[var(--color-muted)]">{label}</p><p className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">{toBangla(value)}</p></div>;
}

function Panel({ title, href, action, children }: { title: string; href?: string; action?: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h2>{href && action && <Link href={href} className="text-sm font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2">{action} →</Link>}</div><div className="mt-5 space-y-3">{children}</div></section>;
}

function WorkRow({ title, meta, href, action }: { title: string; meta: string; href: string; action: string }) {
  return <Link href={href} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-card-border)] px-4 py-3 transition hover:bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"><div><p className="font-medium text-[var(--color-foreground)]">{title}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{meta}</p></div><span className="text-sm font-medium text-[var(--color-primary)]">{action}</span></Link>;
}

function CompactPill({ title, meta }: { title: string; meta: string }) {
  return <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-background)] px-4 py-3"><p className="font-medium text-[var(--color-foreground)]">{title}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{meta}</p></div>;
}

function AccessRow({ item }: { item: DoctorDashboardOut["recent_access"][number] }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-card-border)] px-4 py-3"><div><p className="font-medium text-[var(--color-foreground)]">{item.patient_name ?? "অজানা রোগী"}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{item.screen} · {timeAgoBn(item.viewed_at)}</p></div><span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-medium text-[var(--color-primary)]">{item.context === "chamber" ? "চেম্বার" : "অনলাইন"}</span></div>;
}

function QuickCard({ title, body, href }: { title: string; body: string; href: string }) {
  return <Link href={href} className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-background)] p-4 transition hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"><p className="font-medium text-[var(--color-foreground)]">{title}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{body}</p></Link>;
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-[var(--color-muted)]">{text}</p>;
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>{message}</p><button type="button" onClick={onRetry} className="mt-2 font-medium underline">আবার চেষ্টা করুন</button></div>;
}

function DashboardSkeleton() {
  return <div className="space-y-6">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] animate-pulse" />)}</div>;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}
