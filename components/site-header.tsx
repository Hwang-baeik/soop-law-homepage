"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clearSession, getSession, rest, signOut } from "../lib/supabase-browser";

type UserRole = "admin" | "staff" | "client" | null;

const navigation = [
  { label: "업무분야", href: "/#services" },
  { label: "실무자료실", href: "/board" },
  { label: "오시는 길", href: "/#location" },
  { label: "상담 문의", href: "/consultation" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

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
  const homepage = pathname === "/";
  const mobileLinks = loggedIn
    ? [...navigation, { label: workspaceLabel, href: workspaceHref }, { label: "마이페이지", href: "/account-settings" }]
    : [...navigation, { label: "회원가입", href: "/signup" }];
  const headerSurface = homepage ? "border-soop-rule bg-soop-paper" : "border-stone-200 bg-white";
  const accountButton = homepage
    ? "min-h-10 rounded border-soop-rule lg:px-4"
    : "rounded-full border-emerald-900";

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
    <header className={`sticky top-0 z-[60] border-b ${headerSurface}`}
      onBlur={event => {
        if (menuOpen && (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget))) setMenuOpen(false);
      }}
      onKeyDown={event => {
        if (event.key === "Escape" && menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:p-4">본문으로 바로가기</a>
      <div className={`mx-auto flex min-h-16 items-center justify-between gap-2 px-5 sm:gap-4 sm:px-8 ${homepage ? "max-w-[88rem] lg:min-h-20 lg:px-16" : "max-w-7xl"}`}>
        <Link href="/" className="shrink-0" aria-label="숲 법무사 사무소 홈" onClick={() => setMenuOpen(false)}>
          <Image src="/soop-logo-horizontal.png" alt="숲 법무사 사무소" width={608} height={137} preload
            className={`h-auto w-[clamp(7rem,38vw,9.25rem)] ${homepage ? "mix-blend-multiply lg:w-[clamp(10rem,15vw,12.8125rem)]" : "lg:w-48"}`} />
        </Link>

        <nav aria-label="주요 메뉴" className="hidden items-center gap-5 text-sm font-semibold whitespace-nowrap text-soop-forest lg:flex xl:gap-10">
          {navigation.map(item => <Link key={item.href} href={item.href} className="py-3 hover:underline hover:underline-offset-4">{item.label}</Link>)}
        </nav>

        <div className="flex shrink-0 items-center gap-2 text-soop-forest">
          {loggedIn && <Link href="/account-settings" className="hidden px-2 py-2 text-sm font-semibold whitespace-nowrap hover:underline lg:inline-flex">마이페이지</Link>}
          {!loggedIn && <Link href="/signup" className="hidden px-2 py-2 text-sm font-semibold hover:underline lg:inline-flex">회원가입</Link>}
          {loggedIn ? (
            <button type="button" disabled={loggingOut} onClick={() => { setMenuOpen(false); void logout(); }}
              className={`inline-flex min-h-11 items-center px-1 text-xs font-bold whitespace-nowrap hover:bg-emerald-50 disabled:opacity-50 lg:border lg:px-3 lg:text-sm ${accountButton}`}>{loggingOut ? "로그아웃 중" : "로그아웃"}</button>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)}
              className={`inline-flex min-h-11 items-center px-1 text-xs font-bold whitespace-nowrap hover:bg-emerald-50 lg:border lg:px-4 lg:text-sm ${accountButton}`}>로그인</Link>
          )}
          {loggedIn && <Link href={workspaceHref} className="hidden rounded bg-soop-forest px-3 py-2 text-sm font-bold whitespace-nowrap text-white hover:bg-emerald-950 lg:inline-flex">{workspaceLabel}</Link>}
          <button type="button" ref={menuButton} aria-expanded={menuOpen} aria-controls="site-mobile-menu"
            onClick={() => setMenuOpen(open => !open)}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded border border-soop-rule px-2.5 text-xs font-bold whitespace-nowrap hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-soop-forest lg:hidden">
            {menuOpen ? "닫기" : "메뉴"}
            {menuOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <nav id="site-mobile-menu" aria-label="모바일 주요 메뉴" hidden={!menuOpen}
        className={`absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-y px-5 py-2 text-soop-forest shadow-lg sm:px-8 lg:hidden ${headerSurface}`}>
        {mobileLinks.map(item => (
          <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
            className="flex min-h-13 items-center justify-between border-b border-soop-rule py-2 text-sm font-semibold last:border-b-0 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-soop-forest">
            {item.label}<ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </header>
  );
}
