const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
};

export async function signUp(email: string, password: string, metadata: Record<string, string>) {
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: metadata }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || data.message || "회원가입에 실패했습니다.");
  return data;
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.msg || "로그인에 실패했습니다.");
  return data;
}

export function saveSession(session: AuthSession) {
  sessionStorage.setItem("soop_session", JSON.stringify(session));
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("soop_session");
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  sessionStorage.removeItem("soop_session");
}

export async function rest(path: string, token: string, init?: RequestInit) {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
}
