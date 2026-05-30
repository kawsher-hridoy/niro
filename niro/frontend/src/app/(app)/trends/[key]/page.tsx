"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileText, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { getMetricHistory, downloadDocument, type MetricHistory } from "@/lib/api";
import { toBangla } from "@/lib/i18n";

type PageProps = {
  params: Promise<{ key: string }>;
};

export default function MetricDetailPage(props: PageProps) {
  const { key } = use(props.params);
  const [history, setHistory] = useState<MetricHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMetricHistory(key)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [key]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[var(--color-muted)]">লোড হচ্ছে...</div>
      </div>
    );
  }

  if (!history || history.points.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/trends"
          className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          ফিরে যান
        </Link>
        <p className="text-[var(--color-muted)]">কোনো ডেটা পাওয়া যায়নি</p>
      </div>
    );
  }

  const points = history.points;

  // Single-point case: render a value card with reference band, NOT a broken chart.
  if (points.length === 1) {
    const p = points[0];
    const inRange =
      history.ref_low != null && history.ref_high != null
        ? p.value_num >= history.ref_low && p.value_num <= history.ref_high
        : !p.abnormal;
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/trends"
          className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          সব ট্রেন্ড
        </Link>

        <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
          {history.label_bn}
        </h1>
        <p className="text-[var(--color-muted)] mb-6">একটি রেকর্ড পাওয়া গেছে</p>

        <div className="bg-[var(--color-card)] border border-[var(--color-card-border)] rounded-lg p-8 mb-6">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-5xl font-bold text-[var(--color-primary)]">
              {toBangla(p.value_num)}
            </span>
            {p.unit && (
              <span className="text-lg text-[var(--color-muted)]">{p.unit}</span>
            )}
          </div>
          {p.measured_at && (
            <p className="text-sm text-[var(--color-muted)] mb-4">
              পরিমাপের তারিখ:{" "}
              {new Date(p.measured_at).toLocaleDateString("bn-BD", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          {history.ref_low != null && history.ref_high != null && (
            <div className="mt-4 p-3 rounded bg-[var(--color-accent-soft)]">
              <p className="text-sm text-[var(--color-foreground)]">
                রেফারেন্স রেঞ্জ: {toBangla(history.ref_low)} – {toBangla(history.ref_high)}{" "}
                {history.unit}
              </p>
              <p className="mt-1 text-sm font-medium">
                {inRange ? (
                  <span className="text-green-700">✓ পরিসরের ভিতরে আছে</span>
                ) : (
                  <span className="text-red-700">⚠ পরিসরের বাইরে</span>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="bg-[var(--color-accent-soft)] border border-[var(--color-card-border)] rounded-lg p-5 mb-6">
          <p className="text-sm text-[var(--color-foreground)]">
            <strong>ট্রেন্ড দেখতে আরও রেকর্ড দরকার।</strong> আরেকটি ল্যাব রিপোর্ট আপলোড করলে এখানে সময়ের সাথে আপনার {history.label_bn} এর পরিবর্তন দেখতে পাবেন।
          </p>
        </div>

        <Link
          href={`/analyses/${p.analysis_id}`}
          className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:underline"
        >
          <FileText className="w-4 h-4" />
          সম্পূর্ণ বিশ্লেষণ দেখুন
        </Link>
        {p.document_id && (
          <button
            onClick={() => downloadDocument(p.document_id!)}
            className="ml-4 inline-flex items-center gap-2 text-[var(--color-primary)] hover:underline"
          >
            <Download className="w-4 h-4" />
            মূল ফাইল
          </button>
        )}

        <p className="mt-6 text-xs text-[var(--color-muted)]">
          এই মান AI দ্বারা আপনার রিপোর্ট থেকে সংগৃহীত — চিকিৎসকের পরামর্শ নয়। সিদ্ধান্ত নেওয়ার আগে ডাক্তারের সাথে যাচাই করুন।
        </p>
      </div>
    );
  }

  const values = points.map((p) => p.value_num);
  const minVal = Math.min(...values, history.ref_low ?? Infinity);
  const maxVal = Math.max(...values, history.ref_high ?? -Infinity);
  const range = maxVal - minVal || 1;
  const padding = range * 0.1;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;

  const chartWidth = 800;
  const chartHeight = 300;
  const marginLeft = 60;
  const marginRight = 40;
  const marginTop = 20;
  const marginBottom = 40;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  const xScale = (i: number) => marginLeft + (i / (points.length - 1 || 1)) * plotWidth;
  const yScale = (val: number) =>
    marginTop + plotHeight - ((val - yMin) / (yMax - yMin)) * plotHeight;

  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(p.value_num)}`)
    .join(" ");

  let refBandPath = "";
  if (history.ref_low != null && history.ref_high != null) {
    const yLow = yScale(history.ref_low);
    const yHigh = yScale(history.ref_high);
    refBandPath = `M ${marginLeft} ${yHigh} L ${marginLeft + plotWidth} ${yHigh} L ${marginLeft + plotWidth} ${yLow} L ${marginLeft} ${yLow} Z`;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        href="/trends"
        className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        সব ট্রেন্ড
      </Link>

      <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
        {history.label_bn}
      </h1>
      <p className="text-[var(--color-muted)] mb-6">
        {toBangla(points.length)} টি রেকর্ড
        {history.unit && ` • একক: ${history.unit}`}
      </p>

      {/* Insight banner — computed trend verdict (no AI call) */}
      {history.insight && (
        <div
          className={`mb-6 rounded-lg border p-5 flex items-start gap-3 ${
            history.insight.direction === "improving"
              ? "border-green-200 bg-green-50"
              : history.insight.direction === "worsening"
                ? "border-red-200 bg-red-50"
                : "border-[var(--color-card-border)] bg-[var(--color-accent-soft)]"
          }`}
        >
          <div className="mt-0.5">
            {history.insight.direction === "improving" && (
              <TrendingDown className="w-5 h-5 text-green-700" />
            )}
            {history.insight.direction === "worsening" && (
              <TrendingUp className="w-5 h-5 text-red-700" />
            )}
            {history.insight.direction === "stable" && (
              <Minus className="w-5 h-5 text-[var(--color-muted)]" />
            )}
            {(history.insight.direction === "increasing" ||
              history.insight.direction === "decreasing") && (
              <TrendingUp className="w-5 h-5 text-[var(--color-muted)]" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-[var(--color-foreground)] font-medium">
              {history.insight.verdict_bn}
            </p>
            {history.insight.slope_per_30d != null && history.insight.span_days >= 30 && (
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                প্রতি ৩০ দিনে গড় পরিবর্তন:{" "}
                {history.insight.slope_per_30d > 0 ? "+" : ""}
                {toBangla(history.insight.slope_per_30d.toFixed(2))} {history.unit ?? ""}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-[var(--color-card)] border border-[var(--color-card-border)] rounded-lg p-6 mb-6">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto"
          style={{ maxHeight: "400px" }}
        >
          {/* Reference band */}
          {refBandPath && (
            <path d={refBandPath} fill="var(--color-accent-soft)" opacity="0.5" />
          )}

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = marginTop + frac * plotHeight;
            const val = yMax - frac * (yMax - yMin);
            return (
              <g key={frac}>
                <line
                  x1={marginLeft}
                  y1={y}
                  x2={marginLeft + plotWidth}
                  y2={y}
                  stroke="var(--color-card-border)"
                  strokeWidth="1"
                />
                <text
                  x={marginLeft - 10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize="12"
                  fill="var(--color-muted)"
                >
                  {toBangla(val.toFixed(1))}
                </text>
              </g>
            );
          })}

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={xScale(i)}
              cy={yScale(p.value_num)}
              r="4"
              fill={p.abnormal ? "#ef4444" : "var(--color-primary)"}
              stroke="white"
              strokeWidth="2"
            />
          ))}

          {/* X-axis labels */}
          {points.map((p, i) => {
            if (points.length > 10 && i % Math.ceil(points.length / 8) !== 0) return null;
            const date = p.measured_at
              ? new Date(p.measured_at).toLocaleDateString("bn-BD", {
                  month: "short",
                  day: "numeric",
                })
              : `#${toBangla(i + 1)}`;
            return (
              <text
                key={i}
                x={xScale(i)}
                y={chartHeight - 10}
                textAnchor="middle"
                fontSize="11"
                fill="var(--color-muted)"
              >
                {date}
              </text>
            );
          })}
        </svg>

        {history.ref_low != null && history.ref_high != null && (
          <p className="text-xs text-[var(--color-muted)] mt-4 text-center">
            রেফারেন্স রেঞ্জ: {toBangla(history.ref_low)} – {toBangla(history.ref_high)}{" "}
            {history.unit}
          </p>
        )}
      </div>

      {/* Data table */}
      <div className="bg-[var(--color-card)] border border-[var(--color-card-border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-accent-soft)]">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-[var(--color-foreground)]">
                তারিখ
              </th>
              <th className="text-right px-4 py-3 font-semibold text-[var(--color-foreground)]">
                মান
              </th>
              <th className="text-center px-4 py-3 font-semibold text-[var(--color-foreground)]">
                স্ট্যাটাস
              </th>
              <th className="text-center px-4 py-3 font-semibold text-[var(--color-foreground)]">
                রিপোর্ট
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr
                key={i}
                className="border-t border-[var(--color-card-border)] hover:bg-[var(--color-accent-soft)] hover:bg-opacity-30"
              >
                <td className="px-4 py-3 text-[var(--color-foreground)]">
                  {p.measured_at
                    ? new Date(p.measured_at).toLocaleDateString("bn-BD", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[var(--color-foreground)]">
                  {toBangla(p.value_num)} {p.unit}
                </td>
                <td className="px-4 py-3 text-center">
                  {p.abnormal ? (
                    <span className="inline-block text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                      অস্বাভাবিক
                    </span>
                  ) : (
                    <span className="inline-block text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                      স্বাভাবিক
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={`/analyses/${p.analysis_id}`}
                      className="text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      বিশ্লেষণ
                    </Link>
                    {p.document_id && (
                      <button
                        onClick={() => downloadDocument(p.document_id!)}
                        className="text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                        title="মূল ফাইল ডাউনলোড করুন"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-[var(--color-muted)]">
        এই মান ও ট্রেন্ড AI দ্বারা আপনার রিপোর্ট থেকে সংগৃহীত — চিকিৎসকের পরামর্শ নয়। সিদ্ধান্ত নেওয়ার আগে ডাক্তারের সাথে যাচাই করুন।
      </p>
    </div>
  );
}
