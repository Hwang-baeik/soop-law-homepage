import Image from "next/image";
import Link from "next/link";

const links = [
  ["/#services", "업무분야"],
  ["/board", "실무자료실"],
  ["/#process", "진행절차"],
  ["/#location", "오시는 길"],
] as const;

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:p-4">본문으로 바로가기</a>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="숲 법무사 사무소 홈" className="min-w-0">
          <Image src="/soop-logo-horizontal.png" alt="숲 법무사 사무소" width={608} height={137} preload className="h-auto w-40 sm:w-52" />
        </Link>
        <nav aria-label="주요 메뉴" className="hidden items-center gap-6 text-sm font-semibold text-stone-600 lg:flex">
          {links.map(([href, label]) => <Link key={href} href={href} className="hover:text-emerald-900">{label}</Link>)}
        </nav>
        <Link href="/#consultation" className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-950">상담 문의</Link>
      </div>
      <nav aria-label="모바일 주요 메뉴" className="flex flex-wrap justify-center gap-x-2 border-t border-stone-100 px-2 text-sm font-semibold text-stone-600 lg:hidden">
        {links.map(([href, label]) => <Link key={href} href={href} className="inline-flex min-h-11 items-center px-2 hover:text-emerald-900">{label}</Link>)}
      </nav>
    </header>
  );
}
