"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountShell } from "./account-shell";
import { CompanyOfficerTerms } from "./company-officer-terms";
import { CompanyMaterialsPanel } from "./company-materials-panel";
import { CompanyOfficeRecordsPanel } from "./company-office-records-panel";
import { getSession, rest } from "../lib/supabase-browser";
type Company = { id: string; name: string; corporate_registration_number: string };
export function CompanyDetailClient({ companyId }: { companyId: string }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const session = getSession(); if (!session) throw new Error("다시 로그인해 주세요.");
        const response = await rest(`companies?id=eq.${encodeURIComponent(companyId)}&select=id,name,corporate_registration_number`, session.access_token, { signal: controller.signal });
        if (!response.ok) throw new Error("회사 접근권한을 확인하지 못했습니다.");
        const row = (await response.json())[0]; if (!row) throw new Error("이 회사에 대한 접근권한이 없습니다.");
        if (!controller.signal.aborted) setCompany(row);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "회사 정보를 확인하지 못했습니다."); }
    })();
    return () => controller.abort();
  }, [companyId]);
  const current = company?.id === companyId ? company : null;
  return <AccountShell title={current?.name || "회사 정보"} description="임원 임기와 숲 법무사 사무소의 자료 보관 여부를 확인하고 필요한 자료를 요청합니다.">
    {error ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm">{error}</p> : !current ? <p role="status" className="text-sm">회사 접근권한을 확인하고 있습니다.</p> : <>
      <p className="rounded-xl bg-stone-50 p-4 text-sm">법인등록번호 {current.corporate_registration_number}</p>
      <CompanyOfficerTerms key={`terms-${current.id}`} companyId={current.id} />
      <CompanyMaterialsPanel key={`materials-${current.id}`} companyId={current.id} />
      <div className="mt-8"><CompanyOfficeRecordsPanel key={`office-${current.id}`} companyId={current.id} /></div>
    </>}
    <Link href="/mypage" className="mt-6 inline-block text-sm font-bold text-emerald-900">← 내 회사 목록으로</Link>
  </AccountShell>;
}
