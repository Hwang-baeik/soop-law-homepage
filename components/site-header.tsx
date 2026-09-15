"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession } from "../lib/supabase-browser";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("has-global-home-header", pathname === "/");
    return () => document.body.classList.remove("has-global-home-header");
  }, [pathname]);

  useEffect(() => {
    const syncAuthState = () => setLoggedIn(Boolean(getSession()));
    syncAuthState();
    window.addEventListener("soop-auth-changed", syncAuthState);
    return () => window.removeEventListener("soop-auth-changed", syncAuthState);
  }, [pathname]);

  const home = pathname === "/";

  function logout() {
    clearSession();
    setLoggedIn(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-[60] border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="숲 법무사 사무소 홈">
          <img src="/soop-logo-horizontal.png" alt="숲 법무사 사무소" className="h-9 w-auto sm:h-11" />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-stone-600 lg:flex">
          {home ? (
            <>
              <a href="#services" className="hover:text-emerald-900">업무분야</a>
              <a href="#strength" className="hover:text-emerald-900">강점</a>
              <a href="#process" className="hover:text-emerald-900">진행절차</a>
              <a href="#contact" className="hover:text-emerald-900">상담안내</a>
            </>
          ) : (
            <>
              <Link href="/" className="hover:text-emerald-900">홈</Link>
              <Link href="/board" className="hover:text-emerald-900">실무자료실</Link>
            </>
          )}
          {loggedIn && <Link href="/mypage" className="hover:text-emerald-900">내 회사</Link>}
        </nav>

        <div className="flex items-center gap-2">
          {!loggedIn && <Link href="/signup" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 sm:inline-flex">회원가입</Link>}
          {loggedIn ? (
            <button type="button" onClick={logout} className="inline-flex rounded-full border border-emerald-900 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-50">로그아웃</button>
          ) : (
            <Link href="/login" className="inline-flex rounded-full border border-emerald-900 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-50">로그인</Link>
          )}
          {loggedIn && <Link href="/mypage" className="hidden rounded-full bg-emerald-900 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-950 md:inline-flex">내 회사</Link>}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-t border-stone-100 px-4 py-2 text-sm font-semibold text-stone-600 lg:hidden">
        {home && <a href="#services" className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-stone-100">업무분야</a>}
        <Link href="/board" className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-stone-100">실무자료실</Link>
        {loggedIn && <Link href="/mypage" className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-stone-100">내 회사</Link>}
        {!loggedIn && <Link href="/signup" className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-stone-100 sm:hidden">회원가입</Link>}
        {loggedIn && <button type="button" onClick={logout} className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-stone-100">로그아웃</button>}
      </div>
    </header>
  );
}
