"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { ShellUser, ShellVariant } from "./types";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({
  user,
  variant,
  children,
}: {
  user: ShellUser;
  variant: ShellVariant;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] md:grid md:grid-cols-[256px_minmax(0,1fr)]">
      <Sidebar
        user={user}
        variant={variant}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={() => setDrawerOpen(false)}
      />
      {drawerOpen && (
        <button
          type="button"
          aria-label="সাইডবার বন্ধ করুন"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
        />
      )}
      <div className="min-w-0 md:col-start-2">
        <Topbar user={user} onMenuClick={() => setDrawerOpen(true)} />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
