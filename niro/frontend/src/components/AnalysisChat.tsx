"use client";

import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  ChatMessageOut,
  getConversation,
  sendChatMessage,
} from "@/lib/api";
import { timeAgoBn } from "@/lib/i18n";

export default function AnalysisChat({ analysisId }: { analysisId: string }) {
  const [messages, setMessages] = useState<ChatMessageOut[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getConversation(analysisId)
      .then((c) => {
        if (active) setMessages(c.messages);
      })
      .catch(() => {
        /* empty thread is fine */
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [analysisId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    const optimistic: ChatMessageOut = {
      id: `tmp-${messages.length}`,
      role: "user",
      content_bn: text,
      confidence: null,
      recommend_human_review: false,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setDraft("");
    try {
      const reply = await sendChatMessage(analysisId, text);
      setMessages((m) => [...m, reply]);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 422
          ? "নিরাপত্তার কারণে এই উত্তরটি দেওয়া যায়নি। অনুগ্রহ করে একজন ডাক্তারের সাথে পরামর্শ করুন।"
          : "উত্তর আনতে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
      setError(msg);
      // roll back the optimistic user bubble
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 print:hidden">
      <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
        এই রিপোর্ট নিয়ে প্রশ্ন করুন
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        AI উত্তর শুধু এই বিশ্লেষণের ভিত্তিতে — এটি চিকিৎসকের পরামর্শ নয়।
      </p>

      <div className="mt-4 flex max-h-96 flex-col gap-3 overflow-y-auto">
        {loaded && messages.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--color-muted)]">
            যেমন: “এই ওষুধগুলো কি একসাথে নিরাপদ?”
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--color-accent-soft)] px-4 py-2 text-sm text-[var(--color-foreground)]"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm border border-[var(--color-card-border)] bg-[var(--color-background)] px-4 py-2 text-sm text-[var(--color-foreground)]"
              }
            >
              <p className="whitespace-pre-wrap">{m.content_bn}</p>
              <div className="mt-1 flex items-center gap-2 text-[0.7rem] text-[var(--color-muted)]">
                <span>{timeAgoBn(m.created_at)}</span>
                {m.recommend_human_review && (
                  <span className="text-[var(--color-primary)]">
                    • ডাক্তারের সাথে যাচাই করুন
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-[var(--color-card-border)] bg-[var(--color-background)] px-4 py-2 text-sm text-[var(--color-muted)]">
              লোড হচ্ছে...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder="আপনার প্রশ্ন লিখুন..."
          disabled={sending}
          className="flex-1 resize-none rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !draft.trim()}
          className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          পাঠান
        </button>
      </div>
    </section>
  );
}
