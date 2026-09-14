function getSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!rawUrl) {
    throw new Error("Supabase URL 환경변수가 현재 배포에 적용되지 않았습니다. Vercel Preview 환경에도 NEXT_PUBLIC_SUPABASE_URL을 추가한 뒤 다시 배포해 주세요.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다. https://tgkdjywuvmamvqarcdbi.supabase.co 형태로 입력해 주세요.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL은 https:// 주소여야 합니다.");
  }

  if (!rawKey) {
    throw new Error("Supabase Publishable Key 환경변수가 현재 배포에 적용되지 않았습니다. Vercel Preview 환경에도 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 추가한 뒤 다시 배포해 주세요.");
  }

  return {
    supabaseUrl: rawUrl.replace(/\/+$/, ""),
    publishableKey: rawKey,
  };
}

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
};

export type SignUpResult = {
  access_token?: string | null;
  user?: { id: string; email?: string; identities?: unknown[] } | null;
};

export async function signUp(email: string, password: string, metadata: Record<string, string>): Promise<SignUpResult> {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: metadata }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "회원가입에 실패했습니다.");
  return data;
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.msg || data.message || "로그인에 실패했습니다.");
  return data;
}

export async function updatePassword(token: string, newPassword: string) {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: newPassword }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "비밀번호 변경에 실패했습니다.");
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
  const { supabaseUrl, publishableKey } = getSupabaseConfig();
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}
