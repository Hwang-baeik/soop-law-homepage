"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell } from "./account-shell";
import { CompanyManagementPanel } from "./company-management-panel";
import { CompanySpecialRecordsPanel } from "./company-special-records-panel";
import { CompanyDocumentsPanel } from "./company-documents-panel";
import { CompanyRegistryViewer } from "./company-registry-viewer";
import { CompanyOfficeRecordsPanel } from "./company-office-records-panel";
import { getSession, rest } from "../lib/supabase-browser";

type Company = { id: string; name: string; corporate_registration_number: string };

export function AdminCompanyDetailClient({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const session = getSession();
      if (!session) { router.replace("/login"); return; }
      try {
        const profileResponse = await rest(`profiles?id=eq.${session.user.id}&select=role,status`, session.access_token);
        const profile = (await profileResponse.json())?.[0];
        if (!profile || profile.status !== "approved" || !["admin", "staff"].includes(profile.role)) {
          router.replace("/mypage"); return;
        }
        setIsAdmin(profile.role === "admin");
        const response = await rest(`companies?id=eq.${encodeURIComponent(companyId)}&select=id,name,corporate_registration_number`, session.access_token);
        if (!response.ok) throw new Error("회사정보를 불러오지 못했습니다.");
        const row = (await response.json())?.[0];
        if (!row) throw new Error("이 회사에 대한 관리권한이 없습니다.");
        setCompany(row);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "회사정보 조회 중 오류가 발생했습니다.");
      } finally { setLoading(false); }
    };
    void load();
  }, [companyId, router]);

  if (loading) return <AccountShell title="회사관리" description="회사 관리권한을 확인하고 있습니다."><p className="text-sm text-stone-500">불러오는 중입니다.</p></AccountShell>;
  if (!company) return <AccountShell title="회사관리" description="회사정보를 확인할 수 없습니다."><p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{message}</p><Link href="/admin/companies" className="mt-5 inline-block text-sm font-bold text-emerald-900">← 회사목록</Link></AccountShell>;

  return (
    <AccountShell title={company.name} description={`법인등록번호 ${company.corporate_registration_number} · 등기원본과 구조화된 관리정보를 함께 관리합니다.`}>
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <a href="#office" className="rounded-full bg-emerald-900 px-4 py-2 font-bold text-white">연락처·업무로그</a>
        <a href="#management" className="rounded-full border border-stone-300 px-4 py-2 font-bold">임원·기한정보</a>
        <a href="#special" className="rounded-full border border-stone-300 px-4 py-2 font-bold">특별 관리정보</a>
        <a href="#registry" className="rounded-full border border-stone-300 px-4 py-2 font-bold">등기부등본</a>
        <a href="#documents" className="rounded-full border border-stone-300 px-4 py-2 font-bold">정관·주주명부·문서</a>
      </div>

      <div id="office"><CompanyOfficeRecordsPanel companyId={company.id} editable={isAdmin} /></div>
      <div id="management" className="mt-8"><CompanyManagementPanel companyId={company.id} /></div>
      <div id="special" className="mt-8"><CompanySpecialRecordsPanel companyId={company.id} /></div>
      <div id="registry" className="mt-8"><CompanyRegistryViewer companyId={company.id} canViewDocuments canUploadRegistry /></div>
      <div id="documents" className="mt-8"><CompanyDocumentsPanel companyId={company.id} /></div>
      <div className="mt-6"><Link href="/admin/companies" className="text-sm font-bold text-emerald-900">← 회사목록으로</Link></div>
    </AccountShell>
  );
}
