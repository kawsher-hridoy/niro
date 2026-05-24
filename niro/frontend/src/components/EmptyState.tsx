import Link from "next/link";
import type { ReactNode } from "react";

export type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  body: string;
  cta?: { label: string; href: string };
};

export default function EmptyState({ icon, title, body, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-primary)]">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[var(--color-foreground)]">
        {title}
      </h3>
      <p className="mt-2 text-sm text-[var(--color-muted)] max-w-sm">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
