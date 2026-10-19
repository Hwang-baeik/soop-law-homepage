"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";
import { publicRest } from "../lib/supabase-browser";

export function ManagedCompanyCountBanner() {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (pathname !== "/") return;
    const load = async () => {
      try {
        const response = await publicRest("site_public_stats?id=eq.1&select=managed_company_count");
        if (!response.ok) return;
        const row = (await response.json())?.[0];
        if (row && Number.isFinite(Number(row.managed_company_count))) setCount(Number(row.managed_company_count));
      } catch {}
    };
    void load();
  }, [pathname]);

  if (pathname !== "/") return null;

  return (
    <div className="border-b border-emerald-900/10 bg-emerald-950 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-6 py-3 text-center">
        <Building2 className="h-5 w-5 shrink-0 text-emerald-200" />
        <p className="text-sm font-semibold sm:text-base">
          숲 법무사 사무소에서 현재 관리 중인 회사
          <strong className="mx-2 text-xl font-black text-white sm:text-2xl">{count === null ? "–" : count.toLocaleString()}</strong>
          개
        </p>
      </div>
    </div>
  );
}
