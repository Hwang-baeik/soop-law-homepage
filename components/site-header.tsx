"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession, rest, signOut } from "../lib/supabase-browser";

type UserRole = "admin" | "staff" | "client" | null;

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const syncAuthState = async () => {
      const session = getSession();
      if (!session) {
        if (!cancelled) { setLoggedIn(false); setRole(null); }
        return;
      }
      if (!cancelled) setLoggedIn(true);
      try {
        const response = await rest(`profiles?id=eq.${encodeURIComponent(session.user.id)}&select=role,status`, session.access_token);
        if (!response.ok) {
          if (!cancelled) { setLoggedIn(false); setRole(null); }
          return;
        }
        const profile = (await response.json())?.[0];
        if (!profile || profile.status !== "approved") {
          clearSession();
          if (!cancelled) { setLoggedIn(false); setRole(null); }
          return;
        }
        if (!cancelled) setRole(profile.role as UserRole);
      } catch {
        // 일시적인 네트워크 오류에서는 기존 로그인 표시를 유지합니다.
      }
    };
    void syncAuthState();
    const onAuthChanged = () => { void syncAuthState(); };
    window.addEventListener("soop-auth-changed", onAuthChanged);
    return () => { cancelled = true; window.removeEventListener("soop-auth-changed", onAuthChanged); };
  }, [pathname]);

  const workspaceHref = role === "admin" || role === "staff" ? "/admin/companies" : "/mypage";
  const workspaceLabel = role === "admin" ? "관리자" : role === "staff" ? "사무소 관리" : "내 회사";

  async function logout() {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      await signOut();
    } catch {
      clearSession();
    } finally {
      setLoggedIn(false);
      setRole(null);
      setLoggingOut(false);
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-[60] border-b border-stone-200 bg-white/95 backdrop-blur">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:p-4">본문으로 바로가기</a>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-5 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="숲 법무사 사무소 홈">
          <Image src="/soop-logo-horizontal.png" alt="숲 법무사 사무소" width={608} height={137} preload className="h-auto w-24 sm:w-48" />
        </Link>

        <nav aria-label="주요 메뉴" className="hidden items-center gap-6 text-sm font-semibold text-stone-600 lg:flex">
          <Link href="/#services" className="hover:text-emerald-900">업무분야</Link>
          <Link href="/board" className="hover:text-emerald-900">실무자료실</Link>
          <Link href="/#location" className="hover:text-emerald-900">오시는 길</Link>
          <Link href="/#consultation" className="hover:text-emerald-900">상담 신청</Link>
          {loggedIn && <Link href={workspaceHref} className="hover:text-emerald-900">{workspaceLabel}</Link>}
        </nav>

        <div className="flex items-center gap-2">
          {loggedIn && <Link href="/account-settings" className="inline-flex whitespace-nowrap rounded-full px-2 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 sm:px-3">마이페이지</Link>}
          {!loggedIn && <Link href="/signup" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 sm:inline-flex">회원가입</Link>}
          {loggedIn ? (
            <button type="button" disabled={loggingOut} onClick={() => void logout()} className="inline-flex whitespace-nowrap rounded-full border border-emerald-900 px-3 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-50 disabled:opacity-50 sm:px-4">{loggingOut ? "로그아웃 중" : "로그아웃"}</button>
          ) : (
            <Link href="/login" className="inline-flex rounded-full border border-emerald-900 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-50">로그인</Link>
          )}
          {loggedIn && <Link href={workspaceHref} className="hidden rounded-full bg-emerald-900 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-950 md:inline-flex">{workspaceLabel}</Link>}
        </div>
      </div>

      <nav aria-label="모바일 주요 메뉴" className="flex gap-1 overflow-x-auto border-t border-stone-100 px-4 py-2 text-sm font-semibold text-stone-600 lg:hidden">
        <Link href="/#services" className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-stone-100">업무분야</Link>
        <Link href="/board" className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-stone-100">실무자료실</Link>
        <Link href="/#consultation" className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-stone-100">상담 신청</Link>
        {loggedIn && <Link href={workspaceHref} className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-stone-100">{workspaceLabel}</Link>}
        {!loggedIn && <Link href="/signup" className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-stone-100 sm:hidden">회원가입</Link>}
      </nav>
    </header>
  );
}
