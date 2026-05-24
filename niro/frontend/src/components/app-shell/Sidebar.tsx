"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Clock,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  QrCode,
  Settings,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  X,
} from "lucide-react";
import { apiPost, clearSession } from "@/lib/api";
import type { ShellUser, ShellVariant } from "./types";

type SearchParamsLike = ReturnType<typeof useSearchParams>;

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  isActive: (pathname: string, search: SearchParamsLike) => boolean;
};

const patientItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: "ড্যাশবোর্ড",
    href: "/home",
    isActive: (pathname) => pathname === "/home",
  },
  {
    icon: FileText,
    label: "ডকুমেন্ট",
    href: "/timeline?type=document",
    isActive: (pathname, search) => pathname === "/timeline" && search.get("type") === "document",
  },
  {
    icon: Clock,
    label: "টাইমলাইন",
    href: "/timeline",
    isActive: (pathname, search) => pathname === "/timeline" && !search.get("type"),
  },
  {
    icon: Sparkles,
    label: "AI বিশ্লেষণ",
    href: "/timeline?type=analysis",
    isActive: (pathname, search) => (pathname === "/timeline" && search.get("type") === "analysis") || pathname.startsWith("/analyses/"),
  },
  {
    icon: Stethoscope,
    label: "ডাক্তার",
    href: "/doctors",
    isActive: (pathname) => pathname.startsWith("/doctors"),
  },
  {
    icon: BadgeCheck,
    label: "যাচাই",
    href: "/verifications",
    isActive: (pathname) => pathname.startsWith("/verifications"),
  },
  {
    icon: QrCode,
    label: "চেম্বার স্ক্যান",
    href: "/chamber/scan",
    isActive: (pathname) => pathname.startsWith("/chamber"),
  },
  {
    icon: ShieldCheck,
    label: "অ্যাক্সেস লগ",
    href: "/access-log",
    isActive: (pathname) => pathname === "/access-log",
  },
];

const doctorItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: "ড্যাশবোর্ড",
    href: "/doctor-portal/dashboard",
    isActive: (pathname) => pathname === "/doctor-portal" || pathname.startsWith("/doctor-portal/dashboard"),
  },
  {
    icon: Inbox,
    label: "ইনবক্স",
    href: "/doctor-portal/inbox",
    isActive: (pathname) => pathname.startsWith("/doctor-portal/inbox") || pathname.startsWith("/doctor-portal/cases/"),
  },
  {
    icon: QrCode,
    label: "চেম্বার সেশন",
    href: "/doctor-portal/chamber",
    isActive: (pathname) => pathname.startsWith("/doctor-portal/chamber"),
  },
];

export function Sidebar({
  user,
  variant,
  open,
  onClose,
  onLogout,
}: {
  user: ShellUser;
  variant: ShellVariant;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const items = variant === "doctor" ? doctorItems : patientItems;
  const brandHref = variant === "doctor" ? "/doctor-portal/dashboard" : "/home";

  async function handleLogout() {
    try {
      await apiPost("/auth/logout", {}, { auth: false });
    } catch {
      // logout is best-effort
    }
    clearSession();
    onLogout();
    router.replace("/signin");
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-[var(--color-card-border)] bg-[var(--color-card)] transition-transform duration-200 ease-out md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[var(--color-card-border)] px-5 py-5">
          <Link
            href={brandHref}
            className="text-2xl font-bold tracking-tight text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-sm"
          >
            নিরো
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="সাইডবার বন্ধ করুন"
            className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1">
            {items.map((item) => {
              const active = item.isActive(pathname, search);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-start gap-1 rounded-lg p-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${
                    active
                      ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-primary)]"
                      : "text-[var(--color-foreground)] hover:bg-[var(--color-accent-soft)]"
                  }`}
                >
                  <Icon size={18} strokeWidth={2} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[var(--color-card-border)] px-3 py-4">
          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
            অ্যাকাউন্ট
          </p>
          <div className="flex flex-col gap-1">
            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            >
              <Settings size={18} />
              <span>সেটিংস</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            >
              <LogOut size={18} />
              <span>লগআউট</span>
            </button>
          </div>
          <div className="px-2 pt-4 text-xs text-[var(--color-muted)]">
            {user.full_name}
            <br />
            {user.phone}
          </div>
        </div>
      </div>
    </aside>
  );
}
