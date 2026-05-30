"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPost, apiUpload, ApiError, type AnalysisOut, type DocumentOut } from "@/lib/api";

function UploadForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reanalyzeDocId = params.get("document");
  const initialKind = (params.get("kind") as DocKind | null) ?? "prescription";

  const [kind, setKind] = useState<DocKind>(initialKind);
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"pick" | "uploading" | "analyzing">("pick");
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyzeDoc(documentId: string, userPrompt?: string) {
    setPhase("analyzing");
    // Baseline so polling only matches an analysis created by THIS request
    // (re-analyze can have older analyses on the same document).
    const startedAt = Date.now();
    try {
      const a = await apiPost<AnalysisOut>("/analyses", {
        document_id: documentId,
        use_history: true,
        user_prompt: userPrompt?.trim() || undefined,
      });
      router.replace(`/analyses/${a.id}`);
    } catch (e) {
      // A real API error (422 policy/unreadable, 404, etc.) is final — show it.
      if (e instanceof ApiError) {
        setErr(formatErr(e));
        setPhase("pick");
        return;
      }
      // Otherwise it's a network drop ("TypeError: Failed to fetch"): the AI call
      // takes ~20s and flaky mobile networks kill the silent connection. The
      // backend still finishes and saves the analysis, so poll for it.
      const found = await pollForAnalysis(documentId, startedAt);
      if (found) {
        router.replace(`/analyses/${found}`);
      } else {
        setErr("নেটওয়ার্ক ধীর — বিশ্লেষণ সম্পন্ন হয়নি। আবার চেষ্টা করুন।");
        setPhase("pick");
      }
    }
  }

  // Poll the cheap lookup endpoint until the analysis for this document appears
  // (created at/after we started). Short requests survive flaky networks.
  async function pollForAnalysis(documentId: string, startedAt: number): Promise<string | null> {
    const deadline = Date.now() + 90_000; // give the AI call up to 90s
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const ref = await apiGet<{ id: string; created_at: string }>(
          `/analyses/by-document/${documentId}/latest`,
        );
        // Accept only an analysis fresh enough to be from this attempt.
        if (new Date(ref.created_at).getTime() >= startedAt - 5_000) {
          return ref.id;
        }
      } catch {
        // 404 (not ready yet) or a transient drop — keep polling.
      }
    }
    return null;
  }

  useEffect(() => {
    if (reanalyzeDocId) analyzeDoc(reanalyzeDocId);
  }, [reanalyzeDocId]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    setErr(null);
    setPhase("uploading");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const doc = await apiUpload<DocumentOut>("/documents", form);
      await analyzeDoc(doc.id, prompt);
    } catch (e) {
      setErr(formatErr(e));
      setPhase("pick");
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{reanalyzeDocId ? "পুনঃবিশ্লেষণ" : "নতুন ডকুমেন্ট আপলোড"}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">ডকুমেন্ট আপলোড করলে AI তা বাংলায় ব্যাখ্যা করবে।</p>
      </header>

      {!reanalyzeDocId && (
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">ডকুমেন্টের ধরন</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as DocKind)} className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-background)] px-3 py-2">
            <option value="prescription">প্রেসক্রিপশন</option>
            <option value="lab_report">ল্যাব রিপোর্ট</option>
            <option value="discharge">ডিসচার্জ সামারি</option>
            <option value="other">অন্য</option>
          </select>
        </label>
      )}

      {!reanalyzeDocId && (
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">ফাইল (JPG, PNG, PDF)</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={phase !== "pick"}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-card-border)] bg-[var(--color-background)] px-4 py-6 text-sm text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {file ? "অন্য ফাইল নির্বাচন করুন" : "ফাইল নির্বাচন করুন"}
          </button>
          {file && (
            <span className="text-xs text-[var(--color-muted)]">
              নির্বাচিত: {file.name} · {Math.round(file.size / 1024)} KB
            </span>
          )}
        </div>
      )}

      {!reanalyzeDocId && (
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">AI-কে প্রশ্ন (ঐচ্ছিক)</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="যেমন: এই ওষুধগুলো কি একসাথে নিরাপদ?"
            disabled={phase !== "pick"}
            className="resize-none rounded-lg border border-[var(--color-card-border)] bg-[var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          />
        </label>
      )}

      {phase !== "pick" && <div className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-primary)]">{phase === "uploading" ? "আপলোড করা হচ্ছে..." : "AI বিশ্লেষণ করছে..."}</div>}
      {err && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      {!reanalyzeDocId && <button type="submit" disabled={!file || phase !== "pick"} className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">আপলোড করুন</button>}
      <button type="button" onClick={() => router.push("/home")} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]">← ফিরে যান</button>
    </form>
  );
}

function formatErr(e: unknown): string {
  if (e instanceof ApiError) {
    if (typeof e.body === "object" && e.body && "detail" in e.body) return String((e.body as { detail: unknown }).detail);
    return JSON.stringify(e.body);
  }
  return String(e);
}

type DocKind = "prescription" | "lab_report" | "discharge" | "other";

export default function UploadPage() {
  return <Suspense fallback={<div className="p-8" />}> <UploadForm /> </Suspense>;
}
