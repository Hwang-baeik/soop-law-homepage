import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  ["회원관리", "/admin"],
  ["직원관리", "/admin/staff"],
  ["회사관리", "/admin/companies"],
  ["기한관리", "/admin/deadlines"],
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-extrabold text-emerald-950">숲 법무사 · 관리자</span>
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:border-emerald-800 hover:text-emerald-900">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
