"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMetrics, type MetricSummary } from "@/lib/api";
import { toBangla } from "@/lib/i18n";
import { Activity } from "lucide-react";

export default function TrendsPage() {
  const [metrics, setMetrics] = useState<MetricSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[var(--color-muted)]">লোড হচ্ছে...</div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-6">
          স্বাস্থ্য ট্রেন্ড
        </h1>
        <div className="bg-[var(--color-card)] border border-[var(--color-card-border)] rounded-lg p-8 text-center">
          <Activity className="w-12 h-12 text-[var(--color-muted)] mx-auto mb-4" />
          <p className="text-[var(--color-muted)] mb-2">
            এখনও কোনো স্বাস্থ্য মেট্রিক নেই
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            ল্যাব রিপোর্ট আপলোড করলে এখানে আপনার স্বাস্থ্য তথ্যের ট্রেন্ড দেখতে পাবেন
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
        স্বাস্থ্য ট্রেন্ড
      </h1>
      <p className="text-[var(--color-muted)] mb-6">
        আপনার ল্যাব রিপোর্ট থেকে সংগৃহীত স্বাস্থ্য তথ্যের সময়ভিত্তিক পরিবর্তন
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Link
            key={m.metric_key}
            href={`/trends/${m.metric_key}`}
            className="block bg-[var(--color-card)] border border-[var(--color-card-border)] rounded-lg p-5 hover:border-[var(--color-primary)] transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-[var(--color-foreground)]">
                {m.label_bn}
              </h3>
              {m.abnormal && (
                <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">
                  অস্বাভাবিক
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-[var(--color-primary)]">
                {toBangla(m.latest_value)}
              </span>
              {m.unit && (
                <span className="text-sm text-[var(--color-muted)]">{m.unit}</span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
              <span>{toBangla(m.count)} টি রেকর্ড</span>
              {m.latest_date && (
                <span>
                  {new Date(m.latest_date).toLocaleDateString("bn-BD", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-xs text-[var(--color-muted)]">
        এই মেট্রিকগুলো AI দ্বারা আপনার রিপোর্ট থেকে সংগৃহীত — চিকিৎসকের পরামর্শ নয়।
      </p>
    </div>
  );
}
