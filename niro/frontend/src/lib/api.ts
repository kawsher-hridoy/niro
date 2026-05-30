/**
 * Typed fetch wrapper for the Niro backend.
 *
 * - Reads access token from localStorage (Phase 1; Phase 2 may move to httpOnly cookies)
 * - Throws ApiError on non-2xx with the backend's error envelope decoded
 */

const TOKEN_KEY = "niro_access";
const REFRESH_KEY = "niro_refresh";
const USER_KEY = "niro_user";
const ACCESS_COOKIE = "niro_access";
const REFRESH_COOKIE = "niro_refresh";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export type AuthErrorBody = {
  detail: string;
  fields?: Record<string, string>;
};

export function parseAuthError(e: unknown): AuthErrorBody {
  if (e instanceof ApiError) {
    const b = e.body;
    if (b && typeof b === "object") {
      const obj = b as { detail?: unknown; fields?: unknown };
      // FastAPI sometimes wraps non-string detail as the whole error body
      const inner =
        obj.detail && typeof obj.detail === "object"
          ? (obj.detail as { detail?: unknown; fields?: unknown })
          : null;
      const detail =
        (inner && typeof inner.detail === "string" && inner.detail) ||
        (typeof obj.detail === "string" && obj.detail) ||
        `HTTP ${e.status}`;
      const fields =
        (inner && inner.fields && typeof inner.fields === "object"
          ? (inner.fields as Record<string, string>)
          : undefined) ??
        (obj.fields && typeof obj.fields === "object"
          ? (obj.fields as Record<string, string>)
          : undefined);
      return { detail, fields };
    }
    return { detail: String(b) };
  }
  return { detail: String(e) };
}

export type Session = {
  access: string;
  refresh: string;
  role: "patient" | "doctor" | "admin";
  user_id: string;
  verified?: boolean;
  pending?: boolean;
};

function cookieSuffix(): string {
  if (typeof window === "undefined") return "";
  return window.location.protocol === "https:" ? "; Secure" : "";
}

function setClientCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${cookieSuffix()}`;
}

function readClientCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export function saveSession(s: Session): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, s.access);
  localStorage.setItem(REFRESH_KEY, s.refresh);
  localStorage.setItem(USER_KEY, JSON.stringify({ role: s.role, user_id: s.user_id }));
  setClientCookie(ACCESS_COOKIE, s.access, 60 * 60);
  setClientCookie(REFRESH_COOKIE, s.refresh, 60 * 60 * 24 * 30);
}

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  const access = localStorage.getItem(TOKEN_KEY);
  const refresh = localStorage.getItem(REFRESH_KEY);
  const raw = localStorage.getItem(USER_KEY);
  if (!access || !refresh || !raw) return null;
  try {
    const meta = JSON.parse(raw) as { role: Session["role"]; user_id: string };
    return { access, refresh, ...meta };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  setClientCookie(ACCESS_COOKIE, "", 0);
  setClientCookie(REFRESH_COOKIE, "", 0);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) ?? readClientCookie(ACCESS_COOKIE);
}

async function _send(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.auth !== false) {
    const tok = getToken();
    if (tok) headers.set("Authorization", `Bearer ${tok}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let body: unknown;
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    throw new ApiError(res.status, body);
  }
  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  const r = await _send(path, { method: "GET" });
  return (await r.json()) as T;
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  opts: { auth?: boolean } = {}
): Promise<T> {
  const r = await _send(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    auth: opts.auth,
  });
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const r = await _send(path, { method: "POST", body: form });
  return (await r.json()) as T;
}

// ---------- auth API ----------

export type SignupStartIn = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
};
export type SignupStartOut = {
  signup_token: string;
  expires_at: string;
  otp?: string | null;
};
export type SignupVerifyIn = { signup_token: string; code: string };
export type SignupResendOut = {
  expires_at: string;
  resend_count: number;
  otp?: string | null;
};
export type PasswordLoginIn = { identifier: string; password: string };
export type ResetStartOut = {
  reset_token: string;
  expires_at: string;
  otp?: string | null;
};
export type ResetConfirmIn = { phone: string; code: string; new_password: string };
export type OtpRequestOut = { ok: boolean; dev_hint?: string | null };
export type DoctorApplyIn = SignupStartIn & {
  bmdc_number: string;
  specialties: string[];
  chamber_name: string;
  chamber_address?: string;
  chamber_hours?: string;
  bio?: string;
  fee_tier: number;
};
export type DoctorApplyOut = Session & {
  verified: boolean;
  pending: boolean;
};

export const authApi = {
  signupStart: (body: SignupStartIn) =>
    apiPost<SignupStartOut>("/auth/signup/start", body, { auth: false }),
  signupVerify: (body: SignupVerifyIn) =>
    apiPost<Session>("/auth/signup/verify", body, { auth: false }),
  signupResendOtp: (signup_token: string) =>
    apiPost<SignupResendOut>("/auth/signup/resend-otp", { signup_token }, { auth: false }),
  doctorApply: (body: DoctorApplyIn) =>
    apiPost<DoctorApplyOut>("/auth/doctor/apply", body, { auth: false }),
  loginPassword: (body: PasswordLoginIn) =>
    apiPost<Session>("/auth/login/password", body, { auth: false }),
  loginOtpRequest: (phone: string) =>
    apiPost<OtpRequestOut>("/auth/login/otp/request", { phone }, { auth: false }),
  loginOtpVerify: (phone: string, code: string, full_name?: string) =>
    apiPost<Session>(
      "/auth/login/otp/verify",
      { phone, code, full_name: full_name || undefined },
      { auth: false }
    ),
  resetStart: (phone: string) =>
    apiPost<ResetStartOut>("/auth/password/reset/start", { phone }, { auth: false }),
  resetConfirm: (body: ResetConfirmIn) =>
    apiPost<Session>("/auth/password/reset/confirm", body, { auth: false }),
};

// ---------- typed responses ----------

export type MeOut = {
  user_id: string;
  role: Session["role"];
  phone: string;
  full_name: string;
  language: string;
  dob?: string | null;
  sex?: string | null;
  allergies?: unknown[];
  conditions?: unknown[];
  doctor_verified?: boolean | null;
  doctor_bmdc_number?: string | null;
};

export type DocumentOut = {
  id: string;
  kind: "prescription" | "lab_report" | "discharge" | "other";
  original_name: string | null;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  source: "patient_upload" | "doctor_added";
};

export type Medication = {
  name: string;
  strength?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  notes?: string | null;
};

export type LabValue = {
  parameter: string;
  value: string;
  unit?: string | null;
  reference?: string | null;
  abnormal?: boolean;
};

export type RedFlag = { label_bn: string; severity: "info" | "warn" | "danger" };

export type AnalysisOut = {
  id: string;
  document_id: string;
  kind: string;
  report_type: string | null;
  report_date: string | null;
  structured: {
    patient?: string | { name?: string; age?: number | string; sex?: string };
    diagnosis?: string | string[];
    medications?: Medication[];
    test_panel?: string;
    values?: LabValue[];
    [k: string]: unknown;
  };
  explanation_bn: string;
  red_flags: RedFlag[];
  questions_bn: string[];
  confidence: number;
  model_name: string;
  model_version: string;
  latency_ms: number;
  created_at: string;
  recommend_human_review: boolean;
};

// ---------- health records (grouped by report type) ----------

export type RecordItem = {
  analysis_id: string;
  document_id: string;
  report_date: string | null;
  uploaded_at: string;
  confidence: number;
  summary_bn: string;
  original_name: string | null;
  mime_type: string;
};

export type RecordGroup = {
  report_type: string | null;
  label_bn: string;
  count: number;
  latest_date: string;
  items: RecordItem[];
};

export function getRecords(): Promise<RecordGroup[]> {
  return apiGet<RecordGroup[]>("/me/records");
}

// ---------- health metrics (trends) ----------

export type MetricSummary = {
  metric_key: string;
  label_bn: string;
  latest_value: number;
  unit: string | null;
  latest_date: string | null;
  count: number;
  abnormal: boolean;
};

export type MetricPoint = {
  value_num: number;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  abnormal: boolean;
  measured_at: string | null;
  analysis_id: string;
  document_id: string | null;
};

export type MetricInsight = {
  first_value: number;
  last_value: number;
  delta: number;
  delta_pct: number | null;
  slope_per_30d: number | null;
  span_days: number;
  direction: "improving" | "worsening" | "stable" | "increasing" | "decreasing";
  verdict_bn: string;
};

export type MetricHistory = {
  metric_key: string;
  label_bn: string;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  points: MetricPoint[];
  insight: MetricInsight | null;
};

export function getMetrics(): Promise<MetricSummary[]> {
  return apiGet<MetricSummary[]>("/me/metrics");
}

export function getMetricHistory(metricKey: string): Promise<MetricHistory> {
  return apiGet<MetricHistory>(`/me/metrics/${encodeURIComponent(metricKey)}`);
}

/**
 * Download the original uploaded file. A plain <a href> can't carry the
 * Bearer token, so we fetch with auth, turn the body into a blob, and
 * trigger a client-side download.
 */
export async function downloadDocument(
  documentId: string,
  fallbackName?: string
): Promise<void> {
  const r = await _send(`/documents/${documentId}/download`, { method: "GET" });
  const blob = await r.blob();
  const disposition = r.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const name = match?.[1] || fallbackName || documentId;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type TimelineEntry = {
  entry_type: "document" | "analysis" | "review";
  occurred_at: string;
  document_id?: string | null;
  analysis_id?: string | null;
  review_id?: string | null;
  title_bn: string;
  subtitle_bn?: string | null;
  doctor_name?: string | null;
};

export type AccessLogEntry = {
  id: string;
  doctor_id: string;
  doctor_name: string | null;
  screen: string;
  document_id: string | null;
  viewed_at: string;
  location: string | null;
};

export type DashboardOut = {
  user: {
    id: string;
    full_name: string;
    phone: string;
  };
  counts: {
    documents: number;
    analyses: number;
    verifications: number;
    active_consents: number;
    doctor_views_30d: number;
  };
  recent_documents: Array<{
    id: string;
    kind: DocumentOut["kind"];
    uploaded_at: string;
    analysis_id: string | null;
  }>;
  recent_analyses: Array<{
    id: string;
    document_id: string;
    summary_bn: string;
    confidence: number;
    recommend_human_review: boolean;
    red_flag_count: number;
    created_at: string;
  }>;
  recent_access: Array<{
    doctor_name: string | null;
    screen: string;
    viewed_at: string;
    context: "async" | "chamber";
  }>;
};

export function getDashboard(): Promise<DashboardOut> {
  return apiGet<DashboardOut>("/me/dashboard");
}


export type DoctorStatusOut = {
  verified: boolean;
  bmdc_number: string | null;
  specialties: string[];
  fee_tier: number | null;
};

export type DoctorDashboardOut = {
  user: { id: string; full_name: string; phone: string };
  profile: DoctorStatusOut;
  counts: {
    pending_reviews: number;
    due_soon: number;
    completed_today: number;
    active_chamber_sessions: number;
    recent_patient_access: number;
  };
  urgent_reviews: Array<{
    request_id: string;
    patient_name: string;
    document_kind: string;
    fee_bdt: number;
    created_at: string;
    due_by: string;
    has_review: boolean;
  }>;
  completed_reviews: Array<{
    request_id: string;
    patient_name: string;
    disposition: "agree" | "concerns" | "escalate" | string;
    submitted_at: string;
  }>;
  recent_access: Array<{
    patient_name: string | null;
    screen: string;
    viewed_at: string;
    context: "async" | "chamber";
  }>;
  rating_avg: number | null;
  rating_count: number;
};

export type DoctorCard = {
  id: string;
  full_name: string;
  bmdc_number: string;
  specialties: string[];
  fee_tier: number;
  fee_bdt: number;
  chambers: Array<{ name: string; address?: string; hours?: string }>;
  verified: boolean;
  rating_avg: number | null;
  rating_count: number;
};

export type DoctorProfileOut = DoctorCard & {
  qualifications: Array<{ degree: string; year?: number; institution?: string }>;
  bio: string | null;
  photo_url: string | null;
  reviews: Array<{
    id: string;
    rating: number;
    text: string | null;
    submitted_at: string;
    patient_name: string;
  }>;
};

export type VerificationOut = {
  id: string;
  patient_id: string;
  doctor_id: string;
  document_id: string;
  consent_id: string;
  fee_bdt: number;
  payment_status: "pending" | "paid" | "refunded" | "failed";
  transaction_id: string | null;
  created_at: string;
  due_by: string;
  review_id: string | null;
  review_disposition: "agree" | "concerns" | "escalate" | null;
  review_submitted_at: string | null;
  doctor_name: string | null;
};

export type CaseView = {
  request_id: string;
  patient_id: string;
  patient_name: string;
  document_id: string;
  document_kind: string;
  analysis_id: string | null;
  analysis: {
    structured: AnalysisOut["structured"];
    explanation_bn: string;
    red_flags: RedFlag[];
    questions_bn: string[];
    confidence: number;
  } | null;
  case_summary: {
    patient_summary_bn?: string;
    current_medications?: Medication[];
    ai_concerns?: Array<{ claim_id?: string; claim_bn?: string; severity?: string }>;
    questions_for_doctor?: string[];
    referenced_history?: string[];
  } | null;
  history: Array<{
    id: string;
    document_id: string;
    created_at: string;
    structured: AnalysisOut["structured"];
    explanation_bn: string;
  }>;
  consent_id: string;
};

export type ChamberSessionOut = {
  id: string;
  qr_token: string;
  qr_payload: string;
  doctor_name: string;
  chamber_address: string | null;
  opened_at: string;
  expires_at: string;
  bound_at: string | null;
  closed_at: string | null;
  consent_id: string | null;
  patient_id: string | null;
  patient_name: string | null;
};

export type ChamberProfileOut = {
  session: ChamberSessionOut;
  patient_name: string;
  timeline: Array<{
    kind: "document" | "analysis";
    id: string;
    doc_kind?: string;
    document_id?: string;
    occurred_at: string;
    title_bn: string;
    preview_bn?: string;
  }>;
  latest_analysis: {
    id: string;
    structured: AnalysisOut["structured"];
    explanation_bn: string;
    red_flags: RedFlag[];
    confidence: number;
  } | null;
};

// ---------- chat about an analysis ----------

export type ChatMessageOut = {
  id: string;
  role: "user" | "assistant";
  content_bn: string;
  confidence: number | null;
  recommend_human_review: boolean;
  created_at: string;
};

export type ConversationOut = {
  analysis_id: string;
  conversation_id: string | null;
  messages: ChatMessageOut[];
};

export function getConversation(analysisId: string): Promise<ConversationOut> {
  return apiGet<ConversationOut>(`/conversations/${analysisId}`);
}

export function sendChatMessage(
  analysisId: string,
  content_bn: string
): Promise<ChatMessageOut> {
  return apiPost<ChatMessageOut>(`/conversations/${analysisId}/messages`, {
    content_bn,
  });
}
