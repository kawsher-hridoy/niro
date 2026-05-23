/**
 * Typed fetch wrapper for the Niro backend.
 *
 * - Reads access token from localStorage (Phase 1; Phase 2 may move to httpOnly cookies)
 * - Throws ApiError on non-2xx with the backend's error envelope decoded
 */

const TOKEN_KEY = "niro_access";
const REFRESH_KEY = "niro_refresh";
const USER_KEY = "niro_user";

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

export type Session = {
  access: string;
  refresh: string;
  role: "patient" | "doctor" | "admin";
  user_id: string;
};

export function saveSession(s: Session): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, s.access);
  localStorage.setItem(REFRESH_KEY, s.refresh);
  localStorage.setItem(USER_KEY, JSON.stringify({ role: s.role, user_id: s.user_id }));
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
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
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
    try {
      body = await res.json();
    } catch {
      body = await res.text();
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

// ---------- typed responses ----------

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
