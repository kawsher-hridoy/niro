"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiPost, clearSession } from "@/lib/api";
import type { ShellUser } from "./types";

export function Topbar({
  user,
  onMenuClick,
}: {
  user: ShellUser;
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const title = useMemo(() => getPageTitle(pathname, search), [pathname, search]);
  const avatar = user.full_name.trim().charAt(0) || "ন";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  async function handleLogout() {
    try {
      await apiPost("/auth/logout", {}, { auth: false });
    } catch {
      // best effort
    }
    clearSession();
    router.replace("/signin");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-card-border)] bg-[var(--color-background)]/95 backdrop-blur-sm">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-3 px-6">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="মেনু খুলুন"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-foreground)] hover:bg-[var(--color-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 md:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0 flex-1 text-center md:text-left">
          <p className="truncate text-base font-semibold text-[var(--color-foreground)] md:text-lg">
            {title}
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3" ref={menuRef}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-primary)]">
            <Bell size={18} />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-sm font-semibold text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            {avatar}
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="অ্যাকাউন্ট মেনু"
              className="absolute right-6 top-14 w-64 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-2 shadow-lg"
            >
              <div className="border-b border-[var(--color-card-border)] px-3 py-3">
                <p className="font-medium text-[var(--color-foreground)]">{user.full_name}</p>
                <p className="text-sm text-[var(--color-muted)]">{user.phone}</p>
              </div>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex items-center rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              >
                প্রোফাইল
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              >
                লগআউট
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

type SearchParamsLike = ReturnType<typeof useSearchParams>;

function getPageTitle(pathname: string, search: SearchParamsLike) {
  if (pathname === "/home") return "ড্যাশবোর্ড";
  if (pathname === "/timeline") {
    if (search.get("type") === "analysis") return "AI বিশ্লেষণ";
    if (search.get("type") === "document") return "ডকুমেন্ট";
    return "টাইমলাইন";
  }
  if (pathname.startsWith("/doctors")) return "ডাক্তার";
  if (pathname.startsWith("/verifications")) return "যাচাই";
  if (pathname.startsWith("/access-log")) return "অ্যাক্সেস লগ";
  if (pathname.startsWith("/upload")) return "আপলোড";
  if (pathname.startsWith("/analyses/")) return "AI বিশ্লেষণ";
  if (pathname === "/settings") return "সেটিংস";
  if (pathname.startsWith("/chamber/scan")) return "চেম্বার স্ক্যান";
  if (pathname === "/doctor-portal" || pathname.startsWith("/doctor-portal/dashboard")) return "ড্যাশবোর্ড";
  if (pathname.startsWith("/doctor-portal/inbox")) return "ইনবক্স";
  if (pathname.startsWith("/doctor-portal/chamber")) return "চেম্বার সেশন";
  if (pathname.startsWith("/doctor-portal/cases/")) return "কেস পর্যালোচনা";
  return "নিরো";
}
