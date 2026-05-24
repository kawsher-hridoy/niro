"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, parseAuthError, saveSession } from "@/lib/api";

type Tab = "signin" | "signup" | "doctor";

export default function SignInPage() {
  const [tab, setTab] = useState<Tab>("signin");

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className={`w-full ${tab === "doctor" ? "max-w-2xl" : "max-w-md"}`}>
        <div className="text-center mb-6">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-[var(--color-primary)]"
          >
            নিরো
          </Link>
        </div>
        <div className="bg-[var(--color-card)] border border-[var(--color-card-border)] rounded-xl shadow-sm p-8">
          <Tabs tab={tab} onChange={setTab} />
          {tab === "signin" ? <SignInForm /> : tab === "signup" ? <SignUpForm /> : <DoctorApplyForm />}
        </div>
      </div>
    </main>
  );
}

function Tabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 border-b border-[var(--color-card-border)] mb-6">
      <TabButton active={tab === "signin"} onClick={() => onChange("signin")}>
        সাইন ইন
      </TabButton>
      <TabButton active={tab === "signup"} onClick={() => onChange("signup")}>
        সাইন আপ
      </TabButton>
      <TabButton active={tab === "doctor"} onClick={() => onChange("doctor")}>
        ডাক্তার
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-medium transition border-b-2 -mb-px focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-t ${
        active
          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
          : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

// ---------- Sign in form ----------

function SignInForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    setFieldErrs({});
    setLoading(true);
    try {
      const session = await authApi.loginPassword({ identifier, password });
      saveSession(session);
      router.replace(session.role === "doctor" ? "/doctor-portal/dashboard" : "/home");
    } catch (err) {
      const parsed = parseAuthError(err);
      setTopError(parsed.detail);
      if (parsed.fields) setFieldErrs(parsed.fields);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {topError && <TopError>{translateAuthError(topError)}</TopError>}
      <Field
        label="ফোন নম্বর বা ইমেইল"
        type="text"
        value={identifier}
        onChange={setIdentifier}
        placeholder="+8801XXXXXXXXX বা you@example.com"
        autoComplete="username"
        required
        error={fieldErrs.identifier}
      />
      <PasswordField
        label="পাসওয়ার্ড"
        value={password}
        onChange={setPassword}
        show={showPwd}
        onToggleShow={() => setShowPwd((s) => !s)}
        autoComplete="current-password"
        error={fieldErrs.password}
      />
      <div className="flex justify-end -mt-2">
        <Link
          href="/forgot-password"
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          পাসওয়ার্ড ভুলে গেছেন?
        </Link>
      </div>
      <SubmitButton loading={loading}>সাইন ইন</SubmitButton>
      <OrDivider />
      <Link
        href="/signin/otp"
        className="text-center py-2.5 rounded-lg border border-[var(--color-card-border)] text-[var(--color-foreground)] hover:bg-[var(--color-accent-soft)] transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
      >
        OTP দিয়ে সাইন ইন
      </Link>
    </form>
  );
}

function DoctorApplyForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+8801");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [bmdcNumber, setBmdcNumber] = useState("");
  const [specialties, setSpecialties] = useState("medicine, general");
  const [chamberName, setChamberName] = useState("");
  const [chamberAddress, setChamberAddress] = useState("");
  const [chamberHours, setChamberHours] = useState("");
  const [bio, setBio] = useState("");
  const [feeTier, setFeeTier] = useState(1);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    setFieldErrs({});
    setLoading(true);
    try {
      const out = await authApi.doctorApply({
        full_name: fullName,
        email,
        phone,
        password,
        confirm_password: confirm,
        bmdc_number: bmdcNumber,
        specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean),
        chamber_name: chamberName,
        chamber_address: chamberAddress,
        chamber_hours: chamberHours,
        bio,
        fee_tier: feeTier,
      });
      saveSession(out);
      router.replace(out.pending ? "/doctor-portal/pending" : "/doctor-portal/dashboard");
    } catch (err) {
      const parsed = parseAuthError(err);
      setTopError(parsed.detail);
      if (parsed.fields) setFieldErrs(parsed.fields);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {topError && <TopError>{translateAuthError(topError)}</TopError>}
      <Field label="ডাক্তার নাম" type="text" value={fullName} onChange={setFullName} placeholder="যেমন: ডা. করিম" autoComplete="name" required error={fieldErrs.full_name} />
      <Field label="ইমেইল" type="email" value={email} onChange={setEmail} placeholder="doctor@example.com" autoComplete="email" required error={fieldErrs.email} />
      <Field label="ফোন নম্বর" type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="+8801XXXXXXXXX" autoComplete="tel" required error={fieldErrs.phone} />
      <Field label="BMDC নম্বর" type="text" value={bmdcNumber} onChange={setBmdcNumber} placeholder="BMDC-12345" required error={fieldErrs.bmdc_number} />
      <Field label="বিশেষত্ব (কমা দিয়ে)" type="text" value={specialties} onChange={setSpecialties} placeholder="medicine, cardiology" required error={fieldErrs.specialties} />
      <Field label="চেম্বারের নাম" type="text" value={chamberName} onChange={setChamberName} placeholder="Popular Diagnostic Centre" required />
      <Field label="চেম্বারের ঠিকানা" type="text" value={chamberAddress} onChange={setChamberAddress} placeholder="Dhaka" />
      <Field label="চেম্বার সময়" type="text" value={chamberHours} onChange={setChamberHours} placeholder="6 PM - 9 PM" />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--color-foreground)]">ফি টিয়ার</span>
        <select value={feeTier} onChange={(e) => setFeeTier(Number(e.target.value))} className="border rounded-lg px-4 py-2.5 bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 border-[var(--color-card-border)]">
          <option value={1}>১ - ২০০ ৳</option>
          <option value={2}>২ - ৪০০ ৳</option>
          <option value={3}>৩ - ৮০০ ৳</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--color-foreground)]">সংক্ষিপ্ত পরিচিতি</span>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="border rounded-lg px-4 py-2.5 bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 border-[var(--color-card-border)]" placeholder="অভিজ্ঞতা, বিশেষজ্ঞতা, ইত্যাদি" />
      </label>
      <PasswordField label="পাসওয়ার্ড" value={password} onChange={setPassword} show={showPwd} onToggleShow={() => setShowPwd((s) => !s)} autoComplete="new-password" error={fieldErrs.password} />
      <PasswordField label="পাসওয়ার্ড আবার দিন" value={confirm} onChange={setConfirm} show={showPwd} onToggleShow={() => setShowPwd((s) => !s)} autoComplete="new-password" error={fieldErrs.confirm_password} />
      <SubmitButton loading={loading}>ডাক্তার আবেদন জমা দিন</SubmitButton>
    </form>
  );
}

// ---------- Sign up form ----------

function SignUpForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+8801");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  const strength = useMemo(() => passwordStrength(password), [password]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    setFieldErrs({});
    setLoading(true);
    try {
      const out = await authApi.signupStart({
        full_name: fullName,
        email,
        phone,
        password,
        confirm_password: confirm,
      });
      router.push(
        `/verify?signup_token=${encodeURIComponent(out.signup_token)}&phone=${encodeURIComponent(phone)}`
      );
    } catch (err) {
      const parsed = parseAuthError(err);
      setTopError(parsed.detail);
      if (parsed.fields) setFieldErrs(parsed.fields);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {topError && <TopError>{translateAuthError(topError)}</TopError>}
      <Field
        label="পূর্ণ নাম"
        type="text"
        value={fullName}
        onChange={setFullName}
        placeholder="যেমন: করিম মিয়া"
        autoComplete="name"
        required
        error={fieldErrs.full_name}
      />
      <Field
        label="ইমেইল"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
        required
        error={fieldErrs.email}
      />
      <Field
        label="ফোন নম্বর"
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={setPhone}
        placeholder="+8801XXXXXXXXX"
        autoComplete="tel"
        required
        error={fieldErrs.phone}
      />
      <PasswordField
        label="পাসওয়ার্ড"
        value={password}
        onChange={setPassword}
        show={showPwd}
        onToggleShow={() => setShowPwd((s) => !s)}
        autoComplete="new-password"
        error={fieldErrs.password}
        hint={password ? <StrengthIndicator strength={strength} /> : undefined}
      />
      <PasswordField
        label="পাসওয়ার্ড আবার দিন"
        value={confirm}
        onChange={setConfirm}
        show={showPwd}
        onToggleShow={() => setShowPwd((s) => !s)}
        autoComplete="new-password"
        error={fieldErrs.confirm_password}
      />
      <SubmitButton loading={loading}>অ্যাকাউন্ট তৈরি করুন</SubmitButton>
    </form>
  );
}

// ---------- Shared form pieces ----------

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
  required,
  error,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--color-foreground)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        aria-invalid={!!error}
        className={`border rounded-lg px-4 py-2.5 bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${
          error ? "border-red-400" : "border-[var(--color-card-border)]"
        }`}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
  error?: string;
  hint?: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--color-foreground)]">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          aria-invalid={!!error}
          className={`w-full border rounded-lg px-4 py-2.5 pr-12 bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${
            error ? "border-red-400" : "border-[var(--color-card-border)]"
          }`}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
          className="absolute inset-y-0 right-2 px-2 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-primary)]"
        >
          {show ? "লুকান" : "দেখান"}
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
      {hint}
    </label>
  );
}

function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-2 px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-hover)] transition focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? "অপেক্ষা করুন…" : children}
    </button>
  );
}

function TopError({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
      {children}
    </div>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 border-t border-[var(--color-card-border)]" />
      <span className="text-xs text-[var(--color-muted)]">অথবা</span>
      <div className="flex-1 border-t border-[var(--color-card-border)]" />
    </div>
  );
}

function passwordStrength(p: string): "weak" | "ok" | "strong" {
  const longEnough = p.length >= 8;
  const hasLetter = /[A-Za-z]/.test(p);
  const hasDigit = /\d/.test(p);
  const hasSymbol = /[^A-Za-z0-9]/.test(p);
  const longer = p.length >= 12;
  if (!longEnough || !hasLetter || !hasDigit) return "weak";
  if (longer && hasSymbol) return "strong";
  return "ok";
}

function StrengthIndicator({ strength }: { strength: "weak" | "ok" | "strong" }) {
  const label =
    strength === "weak" ? "দুর্বল" : strength === "ok" ? "ঠিক আছে" : "শক্তিশালী";
  const color =
    strength === "weak"
      ? "bg-red-400"
      : strength === "ok"
        ? "bg-amber-400"
        : "bg-[var(--color-primary)]";
  const width =
    strength === "weak" ? "w-1/3" : strength === "ok" ? "w-2/3" : "w-full";
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-[var(--color-card-border)] overflow-hidden">
        <div className={`h-full ${color} ${width}`} />
      </div>
      <span className="text-xs text-[var(--color-muted)]">{label}</span>
    </div>
  );
}

function translateAuthError(detail: string): string {
  if (detail.startsWith("account locked")) {
    return "অ্যাকাউন্ট সাময়িকভাবে লক — ১৫ মিনিট পরে চেষ্টা করুন।";
  }
  if (detail === "invalid credentials") {
    return "ভুল ফোন/ইমেইল বা পাসওয়ার্ড।";
  }
  if (detail === "duplicate account") {
    return "এই ফোন বা ইমেইলে ইতিমধ্যে একটি অ্যাকাউন্ট আছে।";
  }
  if (detail === "validation failed") {
    return "ইনপুট যাচাই করুন।";
  }
  return detail;
}
