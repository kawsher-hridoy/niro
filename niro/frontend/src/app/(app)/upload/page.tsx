"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost, apiUpload, ApiError, type AnalysisOut, type DocumentOut } from "@/lib/api";

function UploadForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reanalyzeDocId = params.get("document");
  const initialKind = (params.get("kind") as DocKind | null) ?? "prescription";

  const [kind, setKind] = useState<DocKind>(initialKind);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<"pick" | "uploading" | "analyzing">("pick");
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyzeDoc(documentId: string) {
    setPhase("analyzing");
    try {
      const a = await apiPost<AnalysisOut>("/analyses", { document_id: documentId, use_history: true });
      router.replace(`/analyses/${a.id}`);
    } catch (e) {
      setErr(formatErr(e));
      setPhase("pick");
    }
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
      await analyzeDoc(doc.id);
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
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">ফাইল (JPG, PNG, PDF)</span>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          {file && <span className="text-xs text-[var(--color-muted)]">{file.name} · {Math.round(file.size / 1024)} KB</span>}
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
