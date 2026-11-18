"use client";

import { useEffect, useState } from "react";
import { publicRest } from "../lib/supabase-browser";

export function ManagedCompanyCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await publicRest("site_public_stats?id=eq.1&select=managed_company_count", { signal: controller.signal });
        if (!response.ok) return;
        const row = (await response.json())?.[0];
        const value = row?.managed_company_count;
        if (!controller.signal.aborted && value != null && Number.isSafeInteger(Number(value)) && Number(value) >= 0) {
          setCount(Number(value));
        }
      } catch {
        // The count can be unavailable without preventing access to the homepage.
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  return (
    <p className="mt-5 flex w-fit min-w-48 items-baseline gap-3 border-t border-soop-rule pt-2.5 text-xs text-soop-muted lg:mt-8 lg:min-w-58 lg:pt-3.5 lg:text-sm">
      <span>관리 중인 회사</span>
      <strong className="text-xl leading-tight font-extrabold tracking-tight text-soop-forest tabular-nums lg:text-2xl">
        {count === null ? <span aria-label="집계 미표시">–</span> : <>{count.toLocaleString("ko-KR")}<span className="ml-1 text-xs font-semibold">개</span></>}
      </strong>
    </p>
  );
}
