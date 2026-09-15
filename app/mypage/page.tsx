"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell } from "../../components/account-shell";
import { getSession, rest } from "../../lib/supabase-browser";

type Membership = {
  company_id: string;
  member_role: "owner" | "manager" | "member";
  can_view_documents: boolean;
  can_upload_registry: boolean;
};

type CompanyRow = {
  id: string;
  name: string;
  corporate_registration_number: string;
};

type CompanyCard = CompanyRow & Membership;

function permissionLabel(role: Membership["member_role"]) {
  if (role === "owner") return "소유주";
  if (role === "manager") return "관리권한";
  return "하위 멤버";
}

function formatCorporateNumber(value: string) {
  return value.length === 13 ? `${value.slice(0, 6)}-${value.slice(6)}` : value;
}

export default function MyPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyCard[]>([]);
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
          `company_members?user_id=eq.${encodeURIComponent(session.user.id)}&is_active=eq.true&can_view_company=eq.true&select=company_id,member_role,can_view_documents,can_upload_registry`,
          session.access_token,
        );
        if (!membershipResponse.ok) throw new Error("회사 접근권한을 확인하지 못했습니다.");
        const memberships: Membership[] = await membershipResponse.json();
        if (memberships.length === 0) {
          setCompanies([]);
          return;
        }

        const ids = memberships.map((item) => item.company_id);
        const companyResponse = await rest(
          `companies?id=in.(${ids.join(",")})&select=id,name,corporate_registration_number&order=name.asc`,
          session.access_token,
        );
        if (!companyResponse.ok) throw new Error("회사 정보를 불러오지 못했습니다.");
        const companyRows: CompanyRow[] = await companyResponse.json();
        const membershipMap = new Map(memberships.map((item) => [item.company_id, item]));
        setCompanies(
          companyRows
            .map((company) => ({ ...company, ...membershipMap.get(company.id)! }))
            .filter((company) => Boolean(company.company_id)),
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "회사 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router]);

  return (
    <AccountShell
      title="내 회사"
      description="로그인한 회원에게 실제로 부여된 회사와 권한만 표시합니다."
    >
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-bold text-emerald-950">회사 정보와 권한은 숲 법무사 사무소에서 관리합니다.</p>
        <p className="mt-1 text-sm leading-6 text-emerald-900/80">
          회사별로 조회·문서 조회·등기부 업로드 권한이 다를 수 있습니다.
        </p>
      </div>

      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-950">관리 중인 회사</h2>
          <p className="mt-1 text-sm text-stone-500">현재 로그인 계정에 접근이 허용된 회사만 표시합니다.</p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-600">총 {companies.length}개</span>
      </div>

      {loading ? <p className="rounded-2xl bg-stone-50 p-6 text-sm text-stone-500">회사 정보를 불러오는 중입니다.</p> : null}
      {message ? <p className="mb-4 rounded-2xl bg-amber-50 p-5 text-sm text-amber-900">{message}</p> : null}
      {!loading && !message && companies.length === 0 ? (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm leading-6 text-stone-500">현재 이 계정에 연결된 회사가 없습니다. 관리자에게 회사 접근권한을 요청해 주세요.</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {companies.map((company) => (
          <Link
            href={`/mypage/company/${company.id}`}
            key={company.id}
            className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">법인</p>
                <h3 className="mt-1 text-lg font-bold text-stone-950 group-hover:text-emerald-950">{company.name}</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${company.member_role === "owner" ? "bg-emerald-100 text-emerald-900" : company.member_role === "manager" ? "bg-blue-50 text-blue-800" : "bg-stone-100 text-stone-700"}`}>
                {permissionLabel(company.member_role)}
              </span>
            </div>
            <dl className="mt-5 grid gap-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-stone-500">법인등록번호</dt><dd className="font-medium text-stone-800">{formatCorporateNumber(company.corporate_registration_number)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">문서 조회</dt><dd className="font-medium text-stone-800">{company.can_view_documents ? "가능" : "제한"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">등기부 업로드</dt><dd className="font-medium text-stone-800">{company.can_upload_registry ? "가능" : "제한"}</dd></div>
            </dl>
            <div className="mt-5 border-t border-stone-100 pt-4 text-sm font-bold text-emerald-900">회사 정보 보기 →</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-6 text-sm">
        <p className="text-stone-500">권한이 해제되면 회사 데이터는 삭제되지 않고 이 계정에서만 보이지 않게 됩니다.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/change-password" className="font-semibold text-emerald-900">비밀번호 변경</Link>
          <Link href="/account-settings" className="font-semibold text-emerald-900">계정·개인정보 관리</Link>
        </div>
      </div>
    </AccountShell>
  );
}
