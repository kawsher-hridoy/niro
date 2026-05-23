"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, ApiError, loadSession } from "@/lib/api";
import { timeAgoBn, toBangla } from "@/lib/i18n";

type InboxItem = {
  request_id: string;
  patient_id: string;
  patient_name: string;
  document_id: string;
  document_kind: string;
  fee_bdt: number;
  payment_status: string;
  created_at: string;
  due_by: string;
  has_review: boolean;
};

export default function DoctorInboxPage() {
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/signin");
      return;
    }
    if (s.role !== "doctor") {
      setErr("শুধু ডাক্তার অ্যাকাউন্ট এই পেজ দেখতে পারেন।");
      return;
    }
    apiGet<InboxItem[]>("/doctor/inbox")
      .then(setItems)
      .catch((e) => setErr(e instanceof ApiError ? JSON.stringify(e.body) : String(e)));
  }, [router]);

  const pending = items.filter((i) => !i.has_review);
  const done = items.filter((i) => i.has_review);

  return (
    <main className="flex-1 flex flex-col px-6 py-10 max-w-3xl mx-auto w-full gap-6">
      <h1 className="text-2xl font-bold text-accent">ইনবক্স — পর্যালোচনার অপেক্ষায়</h1>
      {err && <p className="text-sm text-red-700">{err}</p>}

      <section>
        <h2 className="font-semibold text-foreground/80 text-sm uppercase tracking-wider mb-2">
          অপেক্ষমাণ ({toBangla(pending.length)})
        </h2>
        {pending.length === 0 && (
          <p className="text-sm text-foreground/60">কোনো অপেক্ষমাণ কেস নেই।</p>
        )}
        <ul className="flex flex-col gap-2">
          {pending.map((i) => (
            <CaseLink key={i.request_id} item={i} />
          ))}
        </ul>
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="font-semibold text-foreground/60 text-sm uppercase tracking-wider mb-2">
            সম্পন্ন ({toBangla(done.length)})
          </h2>
          <ul className="flex flex-col gap-2">
            {done.map((i) => (
              <CaseLink key={i.request_id} item={i} done />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function CaseLink({ item, done = false }: { item: InboxItem; done?: boolean }) {
  return (
    <li
      className={`rounded-xl border px-4 py-3 ${
        done
          ? "border-foreground/10 bg-foreground/[0.02] opacity-70"
          : "border-accent/30 bg-accent/[0.04]"
      } flex items-center justify-between gap-4`}
    >
      <div>
        <p className="font-medium">{item.patient_name}</p>
        <p className="text-xs text-foreground/60">
          {kindBn(item.document_kind)} · ৳{toBangla(item.fee_bdt)} · {timeAgoBn(item.created_at)}
        </p>
      </div>
      <Link
        href={`/doctor-portal/cases/${item.request_id}`}
        className="text-sm text-accent hover:underline whitespace-nowrap"
      >
        {done ? "পর্যালোচনা দেখুন →" : "পর্যালোচনা করুন →"}
      </Link>
    </li>
  );
}

function kindBn(k: string): string {
  switch (k) {
    case "prescription":
      return "প্রেসক্রিপশন";
    case "lab_report":
      return "ল্যাব রিপোর্ট";
    default:
      return "ডকুমেন্ট";
  }
}
