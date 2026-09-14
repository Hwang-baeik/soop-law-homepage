"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell } from "./account-shell";
import { CompanyDocumentsPanel } from "./company-documents-panel";
import { CompanyRegistryViewer } from "./company-registry-viewer";
import { getSession, rest } from "../lib/supabase-browser";

type Membership = {
  member_role: "owner" | "manager" | "member";
  can_view_documents: boolean;
  can_upload_registry: boolean;
};

type Company = {
  id: string;
  name: string;
  corporate_registration_number: string;
};

const sampleShareholders = [
  ["주주명", "주식종류", "주식수", "지분율"],
  ["등록된 정보 없음", "-", "-", "-"],
];

function permissionLabel(role: Membership["member_role"]) {
  if (role === "owner") return "소유주";
  if (role === "manager") return "관리권한";
  return "하위 멤버";
}

export function CompanyDetailClient({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const session = getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const membershipResponse = await rest(
          `company_members?company_id=eq.${encodeURIComponent(companyId)}&user_id=eq.${encodeURIComponent(session.user.id)}&is_active=eq.true&can_view_company=eq.true&select=member_role,can_view_documents,can_upload_registry`,
          session.access_token,
        );
        if (!membershipResponse.ok) throw new Error("회사 접근권한을 확인하지 못했습니다.");
        const membershipRows: Membership[] = await membershipResponse.json();
        const currentMembership = membershipRows[0];
        if (!currentMembership) {
          setMessage("이 회사에 대한 접근권한이 없습니다.");
          return;
        }
        setMembership(currentMembership);

        const companyResponse = await rest(
          `companies?id=eq.${encodeURIComponent(companyId)}&select=id,name,corporate_registration_number`,
          session.access_token,
        );
        if (!companyResponse.ok) throw new Error("회사 정보를 불러오지 못했습니다.");
        const companyRows: Company[] = await companyResponse.json();
        if (!companyRows[0]) {
          setMessage("회사 정보를 확인할 수 없습니다.");
          return;
        }
        setCompany(companyRows[0]);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "회사 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [companyId, router]);

  if (loading) {
    return <AccountShell title="회사 정보" description="접근권한과 회사 정보를 확인하고 있습니다."><p className="rounded-2xl bg-stone-50 p-6 text-sm text-stone-500">불러오는 중입니다.</p></AccountShell>;
  }

  if (!company || !membership) {
    return (
      <AccountShell title="회사 정보" description="접근권한을 확인할 수 없습니다.">
        <p className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900">{message || "회사 접근권한이 없습니다."}</p>
        <div className="mt-6"><Link href="/mypage" className="text-sm font-bold text-emerald-900">← 내 회사 목록으로</Link></div>
      </AccountShell>
    );
  }

  const permission = permissionLabel(membership.member_role);
  const mailSubject = encodeURIComponent(`[회사정보 변경요청] ${company.name}`);
  const mailBody = encodeURIComponent(`회사명: ${company.name}\n요청자 권한: ${permission}\n\n변경이 필요한 항목:\n\n변경 요청 내용:\n`);

  return (
    <AccountShell title={company.name} description="등기부등본 원본과 회사 내부 관리자료를 확인합니다.">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-300 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">COMPANY RECORD</p>
          <p className="mt-2 text-sm text-stone-500">나의 권한</p>
          <p className="mt-1 font-bold text-stone-950">{permission}</p>
          <p className="mt-2 text-xs text-stone-500">법인등록번호 {company.corporate_registration_number}</p>
        </div>
        <a
          href={`mailto:soop@sooplaw.com?subject=${mailSubject}&body=${mailBody}`}
          className="inline-flex rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-950"
        >
          정보 변경 요청
        </a>
      </div>

      <CompanyRegistryViewer
        companyId={company.id}
        canViewDocuments={membership.can_view_documents}
        canUploadRegistry={membership.can_upload_registry}
      />

      <section className="mt-8 overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-emerald-800">SHAREHOLDERS</p>
            <h2 className="mt-1 text-lg font-extrabold">주주 구성</h2>
          </div>
          <span className="text-xs text-stone-500">관리자 업데이트</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>{sampleShareholders[0].map((cell) => <th key={cell} className="border-b border-stone-200 px-4 py-3 text-left font-semibold">{cell}</th>)}</tr>
            </thead>
            <tbody>
              <tr>{sampleShareholders[1].map((cell, index) => <td key={`${cell}-${index}`} className="border-b border-stone-100 px-4 py-4 text-stone-700">{cell}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      {membership.can_view_documents ? (
        <CompanyDocumentsPanel companyId={company.id} />
      ) : (
        <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600">이 계정에는 정관·주주명부·기타 회사 문서 조회 권한이 없습니다.</div>
      )}

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        등기사항은 업로드된 등기부등본 PDF 원본을 기준으로 확인합니다. 회사별 권한은 관리자가 부여하며, 접근권한이 해제되어도 원본 데이터는 삭제되지 않습니다.
      </div>

      <div className="mt-6"><Link href="/mypage" className="text-sm font-bold text-emerald-900">← 내 회사 목록으로</Link></div>
    </AccountShell>
  );
}
