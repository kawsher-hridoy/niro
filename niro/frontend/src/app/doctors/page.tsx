"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, ApiError, loadSession, type DoctorCard } from "@/lib/api";
import { toBangla } from "@/lib/i18n";

const SPECIALTIES: Array<{ id: string; label_bn: string }> = [
  { id: "", label_bn: "সব" },
  { id: "diabetes", label_bn: "ডায়াবেটিস" },
  { id: "cardiology", label_bn: "হৃদরোগ" },
  { id: "eye", label_bn: "চোখ" },
  { id: "pediatrics", label_bn: "শিশু" },
  { id: "ent", label_bn: "ENT" },
  { id: "medicine", label_bn: "মেডিসিন" },
];

const TIERS = [
  { id: 0, label_bn: "যেকোনো ফি" },
  { id: 1, label_bn: "MBBS — ২০০ ৳" },
  { id: 2, label_bn: "FCPS/MD — ৪০০ ৳" },
  { id: 3, label_bn: "সিনিয়র — ৮০০ ৳" },
];

export default function DoctorsDirectory() {
  const router = useRouter();
  const [docs, setDocs] = useState<DoctorCard[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [specialty, setSpecialty] = useState("");
  const [tier, setTier] = useState(0);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!loadSession()) {
      router.replace("/signin");
      return;
    }
    const params = new URLSearchParams();
    if (specialty) params.set("specialty", specialty);
    if (tier > 0) params.set("fee_tier", String(tier));
    if (q.trim()) params.set("q", q.trim());
    setLoaded(false);
    apiGet<DoctorCard[]>(`/doctors${params.size ? `?${params}` : ""}`)
      .then(setDocs)
      .catch((e) => setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e)))
      .finally(() => setLoaded(true));
  }, [specialty, tier, q, router]);

  return (
    <main className="flex-1 flex flex-col px-6 py-10 max-w-3xl mx-auto w-full gap-6">
      <Link href="/home" className="text-sm text-foreground/60 hover:text-foreground">
        ← আপনার নিরো
      </Link>
      <h1 className="text-2xl font-bold text-accent">ডাক্তার ডিরেক্টরি</h1>

      <div className="grid sm:grid-cols-3 gap-3">
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="border border-foreground/20 rounded-lg px-3 py-2 text-sm"
        >
          {SPECIALTIES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label_bn}
            </option>
          ))}
        </select>
        <select
          value={tier}
          onChange={(e) => setTier(Number(e.target.value))}
          className="border border-foreground/20 rounded-lg px-3 py-2 text-sm"
        >
          {TIERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label_bn}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="নাম দিয়ে খুঁজুন"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border border-foreground/20 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {!loaded && <p className="text-sm text-foreground/60">লোড হচ্ছে...</p>}
      {err && <p className="text-sm text-red-700">{err}</p>}
      {loaded && docs.length === 0 && (
        <p className="text-sm text-foreground/60">কোনো ডাক্তার পাওয়া যায়নি।</p>
      )}

      <ul className="flex flex-col gap-3">
        {docs.map((d) => (
          <li
            key={d.id}
            className="rounded-xl border border-foreground/10 px-4 py-4 bg-foreground/[0.02] flex items-center justify-between gap-4"
          >
            <div className="flex-1">
              <p className="font-semibold">{d.full_name}</p>
              <p className="text-xs text-foreground/50">BMDC {d.bmdc_number}</p>
              <p className="text-sm text-foreground/70 mt-1">
                {d.specialties.slice(0, 3).join(" · ")}
              </p>
              {d.chambers[0] && (
                <p className="text-xs text-foreground/50 mt-1">
                  📍 {d.chambers[0].name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-accent">
                ৳{toBangla(d.fee_bdt)}
              </p>
              <p className="text-xs text-foreground/50">
                {d.rating_count > 0
                  ? `★ ${(d.rating_avg ?? 0).toFixed(1)} (${toBangla(d.rating_count)})`
                  : "নতুন"}
              </p>
              <Link
                href={`/doctors/${d.id}`}
                className="inline-block mt-2 text-sm text-accent hover:underline"
              >
                বিস্তারিত →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
