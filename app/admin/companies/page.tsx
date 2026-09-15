"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell } from "../../../components/account-shell";
import { getSession, rest } from "../../../lib/supabase-browser";

type Company = { id: string; name: string; corporate_registration_number: string; created_at: string };

export default function AdminCompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
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
          router.replace("/mypage");
          return;
        }
        const response = await rest("companies?select=id,name,corporate_registration_number,created_at&order=name.asc", session.access_token);
        if (!response.ok) throw new Error("관리 가능한 회사 목록을 불러오지 못했습니다.");
        setCompanies(await response.json());
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "회사 목록 조회 중 오류가 발생했습니다.");
      } finally { setLoading(false); }
    };
    void load();
  }, [router]);

  return (
    <AccountShell title="회사관리" description="관리자에게는 전체 회사가, 직원에게는 담당 배정된 회사만 표시됩니다. 회사별로 임원·종류주식·사채·기한정보를 관리합니다.">
      {message && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
      {loading ? <p className="text-sm text-stone-500">불러오는 중입니다.</p> : (
        <div className="grid gap-3">
          {companies.length === 0 ? <p className="rounded-xl bg-stone-50 p-5 text-sm text-stone-500">현재 관리 가능한 회사가 없습니다.</p> : companies.map((company) => (
            <Link key={company.id} href={`/admin/company/${company.id}`} className="block rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-emerald-800 hover:shadow-sm">
              <p className="font-extrabold text-stone-950">{company.name}</p>
              <p className="mt-1 text-sm text-stone-500">법인등록번호 {company.corporate_registration_number}</p>
              <p className="mt-3 text-sm font-semibold text-emerald-900">관리정보 열기 →</p>
            </Link>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
