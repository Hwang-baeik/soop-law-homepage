import Link from "next/link";
import type { ReactNode } from "react";

export function AccountShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-10 text-stone-900">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 inline-flex items-center text-sm font-semibold text-emerald-900">← 숲 법무사 사무소</Link>
        <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm md:p-10">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 leading-7 text-stone-600">{description}</p>
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

export const fieldClassName = "h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm outline-none transition focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/10";
export const primaryButtonClassName = "h-12 w-full rounded-xl bg-emerald-900 px-5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
