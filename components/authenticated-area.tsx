"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getJwtAal, getSession, listMfaFactors, rest } from "../lib/supabase-browser";
import { accessRedirect, type ApprovedProfile } from "../lib/auth-access";

export function AuthenticatedArea({ children, internal = false }: { children: ReactNode; internal?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowedPath, setAllowedPath] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const session = getSession();
      if (!session) { router.replace("/login"); return; }
      try {
        const response = await rest(`profiles?id=eq.${encodeURIComponent(session.user.id)}&select=role,status,must_change_password`, session.access_token);
        if (cancelled) return;
        if (response.status === 401) { clearSession(); router.replace("/login"); return; }
        if (!response.ok) throw new Error("회원 권한을 확인하지 못했습니다. 다시 확인해 주세요.");
        const profile: ApprovedProfile | null = (await response.json())?.[0] ?? null;
        if (cancelled) return;
        const destination = accessRedirect(profile, internal);
        if (destination) {
          if (destination === "/login") clearSession();
          router.replace(destination);
          return;
        }
        if (internal && profile?.role === "admin" && pathname !== "/admin/security") {
          const factors = await listMfaFactors(getSession()?.access_token ?? session.access_token);
          if (cancelled) return;
          if (factors.some((factor) => factor.status === "verified") && getJwtAal(getSession()?.access_token ?? session.access_token) !== "aal2") {
            router.replace("/admin/security?challenge=1");
            return;
          }
        }
        if (!cancelled && getSession()?.user.id === session.user.id) {
          setMessage("");
          setAllowedPath(pathname);
        }
      } catch (error) {
        if (!cancelled) {
          setAllowedPath("");
          setMessage(error instanceof Error ? error.message : "로그인 상태를 확인하지 못했습니다.");
        }
      }
    };
    void check();
    const onLogout = () => {
      if (!getSession()) { setAllowedPath(""); router.replace("/login"); }
    };
    window.addEventListener("soop-auth-changed", onLogout);
    return () => { cancelled = true; window.removeEventListener("soop-auth-changed", onLogout); };
  }, [router, pathname, internal, attempt]);

  if (allowedPath !== pathname || message) {
    return (
      <div id="main-content" role="status" className="mx-auto flex min-h-[50vh] max-w-5xl flex-col items-center justify-center gap-4 px-6 text-sm text-stone-600">
        <p>{message || "로그인 상태와 접근권한을 확인하고 있습니다."}</p>
        {message && <button onClick={() => { setMessage(""); setAttempt((value) => value + 1); }} className="rounded-full border border-stone-300 px-5 py-3">다시 확인</button>}
      </div>
    );
  }

  return <>{children}</>;
}
