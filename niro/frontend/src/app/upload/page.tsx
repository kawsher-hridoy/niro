"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  apiPost,
  apiUpload,
  ApiError,
  loadSession,
  type DocumentOut,
  type AnalysisOut,
} from "@/lib/api";

type DocKind = "prescription" | "lab_report" | "discharge" | "other";

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

  useEffect(() => {
    if (!loadSession()) router.replace("/signin");
  }, [router]);

  async function analyzeDoc(documentId: string) {
    setPhase("analyzing");
    try {
      const a = await apiPost<AnalysisOut>("/analyses", {
        document_id: documentId,
        use_history: true,
      });
      router.replace(`/analyses/${a.id}`);
    } catch (e) {
      setErr(formatErr(e));
      setPhase("pick");
    }
  }

  useEffect(() => {
    if (reanalyzeDocId) {
      analyzeDoc(reanalyzeDocId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reanalyzeDocId]);

  async function submit(e: React.FormEvent) {
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
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <form
        onSubmit={submit}
        className="w-full max-w-md flex flex-col gap-5 bg-foreground/[0.02] border border-foreground/10 rounded-2xl p-8"
      >
        <h1 className="text-2xl font-bold text-accent">
          {reanalyzeDocId ? "পুনঃবিশ্লেষণ" : "নতুন ডকুমেন্ট আপলোড"}
        </h1>

        {!reanalyzeDocId && (
          <>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">ডকুমেন্টের ধরন</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as DocKind)}
                className="border border-foreground/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="prescription">প্রেসক্রিপশন</option>
                <option value="lab_report">ল্যাব রিপোর্ট</option>
                <option value="discharge">ডিসচার্জ সামারি</option>
                <option value="other">অন্য</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">ফাইল (JPG, PNG, PDF)</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {file && (
                <span className="text-xs text-foreground/60">
                  {file.name} · {Math.round(file.size / 1024)} KB
                </span>
              )}
            </label>
          </>
        )}

        {phase !== "pick" && (
          <div className="border border-accent/20 bg-accent/[0.05] rounded-lg px-4 py-3 text-sm text-accent">
            {phase === "uploading"
              ? "আপলোড করা হচ্ছে..."
              : "AI বিশ্লেষণ করছে... এতে ৩-৮ সেকেন্ড লাগতে পারে।"}
          </div>
        )}

        {err && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
            {err}
          </p>
        )}

        {!reanalyzeDocId && (
          <button
            type="submit"
            disabled={!file || phase !== "pick"}
            className="px-5 py-3 rounded-lg bg-accent text-white font-medium disabled:opacity-50"
          >
            আপলোড করুন
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push("/home")}
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← ফিরে যান
        </button>
      </form>
    </main>
  );
}

function formatErr(e: unknown): string {
  if (e instanceof ApiError) {
    if (typeof e.body === "object" && e.body && "detail" in e.body) {
      return String((e.body as { detail: unknown }).detail);
    }
    return JSON.stringify(e.body);
  }
  return String(e);
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <UploadForm />
    </Suspense>
  );
}
