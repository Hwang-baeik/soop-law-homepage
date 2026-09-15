function getSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!rawUrl) throw new Error("Supabase URL 환경변수가 현재 배포에 적용되지 않았습니다.");
  let parsedUrl: URL;
  try { parsedUrl = new URL(rawUrl); } catch { throw new Error("NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다."); }
  if (parsedUrl.protocol !== "https:") throw new Error("NEXT_PUBLIC_SUPABASE_URL은 https:// 주소여야 합니다.");
  if (!rawKey) throw new Error("Supabase Publishable Key 환경변수가 현재 배포에 적용되지 않았습니다.");

  return { supabaseUrl: rawUrl.replace(/\/+$/, ""), publishableKey: rawKey };
}

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type?: string;
  user: { id: string; email?: string };
};

export type SignUpResult = {
  access_token?: string | null;
  user?: { id: string; email?: string; identities?: unknown[] } | null;
};

export type MfaFactor = {
  id: string;
  status: "verified" | "unverified" | string;
  factor_type?: string;
  friendly_name?: string;
};

function normalizeSession(session: AuthSession): AuthSession {
  if (!session.expires_at && session.expires_in) {
    return { ...session, expires_at: Math.floor(Date.now() / 1000) + Number(session.expires_in) };
  }
  return session;
}

function jwtExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(atob(normalized));
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch { return null; }
}

function sessionNeedsRefresh(session: AuthSession) {
  const expiresAt = session.expires_at ?? jwtExpiry(session.access_token);
  return Boolean(expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 60);
}

function emitAuthChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("soop-auth-changed"));
}

export function saveSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("soop_session", JSON.stringify(normalizeSession(session)));
  emitAuthChanged();
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("soop_session");
  if (!raw) return null;
  try { return normalizeSession(JSON.parse(raw) as AuthSession); }
  catch { sessionStorage.removeItem("soop_session"); return null; }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("soop_session");
  emitAuthChanged();
}

let refreshPromise: Promise<AuthSession | null> | null = null;

async function refreshStoredSession(): Promise<AuthSession | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const current = getSession();
    if (!current?.refresh_token) { clearSession(); return null; }
    const { supabaseUrl, publishableKey } = getSupabaseConfig();
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: current.refresh_token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.access_token) {
        clearSession();
        return null;
      }
      const refreshed = normalizeSession(data as AuthSession);
      saveSession(refreshed);
      return refreshed;
    } catch {
      return null;
    }
  })();
  try { return await refreshPromise; }
  finally { refreshPromise = null; }
}

async function resolveAccessToken(requestedToken: string) {
  const current = getSession();
  if (!current || current.access_token !== requestedToken) return requestedToken;
  if (!sessionNeedsRefresh(current)) return current.access_token;
  const refreshed = await refreshStoredSession();
  return refreshed?.access_token ?? requestedToken;
}

async function retryAfterUnauthorized(url: string, token: string, init: RequestInit, headers: Record<string, string>) {
  let activeToken = await resolveAccessToken(token);
  let response = await fetch(url, { ...init, headers: { ...headers, Authorization: `Bearer ${activeToken}`, ...(init.headers || {}) } });
  if (response.status !== 401) return response;
  const current = getSession();
  if (!current || current.access_token !== activeToken) return response;
  const refreshed = await refreshStoredSession();
  if (!refreshed) return response;
  activeToken = refreshed.access_token;
  response = await fetch(url, { ...init, headers: { ...headers, Authorization: `Bearer ${activeToken}`, ...(init.headers || {}) } });
  return response;
}

export async function signUp(email: string, password: string, metadata: Record<string, string>): Promise<SignUpResult> {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
  const signupUrl = redirectTo ? `${supabaseUrl}/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}` : `${supabaseUrl}/auth/v1/signup`;
  const response = await fetch(signupUrl, { method: "POST", headers: { apikey: publishableKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, password, data: metadata }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "회원가입에 실패했습니다.");
  return data;
}

export async function resendSignupConfirmation(email: string) {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
  const resendUrl = redirectTo ? `${supabaseUrl}/auth/v1/resend?redirect_to=${encodeURIComponent(redirectTo)}` : `${supabaseUrl}/auth/v1/resend`;
  const response = await fetch(resendUrl, { method: "POST", headers: { apikey: publishableKey, "Content-Type": "application/json" }, body: JSON.stringify({ type: "signup", email }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "인증메일 재발송에 실패했습니다.");
  return data;
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: publishableKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const data = await response.json();
  if (!response.ok) {
    const rawMessage = data.error_description || data.msg || data.message || "로그인에 실패했습니다.";
    if (String(rawMessage).toLowerCase().includes("email not confirmed")) throw new Error("이메일 인증이 아직 완료되지 않았습니다. 가입 시 받은 인증메일의 링크를 먼저 눌러 주세요.");
    throw new Error(rawMessage);
  }
  return normalizeSession(data as AuthSession);
}

export async function signOut() {
  const session = getSession();
  if (!session) { clearSession(); return; }
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  try {
    const token = await resolveAccessToken(session.access_token);
    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
    });
  } finally {
    clearSession();
  }
}

export async function updatePassword(token: string, newPassword: string) {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, { method: "PUT", headers: { apikey: publishableKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ password: newPassword }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "비밀번호 변경에 실패했습니다.");
  return data;
}

async function authRequest(path: string, token: string, init?: RequestInit) {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  const response = await retryAfterUnauthorized(
    `${supabaseUrl}/auth/v1/${path}`,
    token,
    init || {},
    { apikey: publishableKey, "Content-Type": "application/json" },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "보안 인증 요청에 실패했습니다.");
  return data;
}

export async function listMfaFactors(token: string): Promise<MfaFactor[]> {
  const data = await authRequest("factors", token);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.all)) return data.all;
  if (Array.isArray(data?.totp)) return data.totp;
  return [];
}

export async function enrollTotp(token: string) {
  return authRequest("factors", token, { method: "POST", body: JSON.stringify({ factor_type: "totp", friendly_name: "숲 법무사 관리자" }) });
}

export async function challengeMfa(token: string, factorId: string) {
  return authRequest(`factors/${encodeURIComponent(factorId)}/challenge`, token, { method: "POST", body: JSON.stringify({}) });
}

export async function verifyMfa(token: string, factorId: string, challengeId: string, code: string): Promise<AuthSession> {
  return normalizeSession(await authRequest(`factors/${encodeURIComponent(factorId)}/verify`, token, { method: "POST", body: JSON.stringify({ challenge_id: challengeId, code }) }) as AuthSession);
}

export function getJwtAal(token: string): string {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)).aal || "aal1";
  } catch { return "aal1"; }
}

export async function rest(path: string, token: string, init?: RequestInit) {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  return retryAfterUnauthorized(
    `${supabaseUrl}/rest/v1/${path}`,
    token,
    init || {},
    { apikey: publishableKey, "Content-Type": "application/json" },
  );
}

export async function publicRest(path: string, init?: RequestInit) {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers: { apikey: publishableKey, "Content-Type": "application/json", ...(init?.headers || {}) } });
}

export async function storageRequest(path: string, token: string, init?: RequestInit) {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  return retryAfterUnauthorized(
    `${supabaseUrl}/storage/v1/${path.replace(/^\/+/, "")}`,
    token,
    init || {},
    { apikey: publishableKey },
  );
}

export async function invokeFunction(name: string, token: string, body: unknown) {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  return retryAfterUnauthorized(
    `${supabaseUrl}/functions/v1/${encodeURIComponent(name)}`,
    token,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    { apikey: publishableKey },
  );
}
