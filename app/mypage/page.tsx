import Link from "next/link";
import { AccountShell } from "../../components/account-shell";

const demoCompanies = [
  { id: "owner-company", name: "소유 회사 예시", registrationNumber: "110111-1234567", permission: "소유주", updatedAt: "관리자 업데이트 예정" },
  { id: "managed-company", name: "관리 회사 예시", registrationNumber: "110111-7654321", permission: "관리권한", updatedAt: "관리자 업데이트 예정" },
];

export default function MyPage() {
  return (
    <AccountShell
      title="내 회사"
      description="로그인한 회원에게 소유권 또는 관리권한이 부여된 회사를 한 곳에서 확인합니다."
    >
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-bold text-emerald-950">회사 정보는 숲 법무사 사무소에서 관리합니다.</p>
        <p className="mt-1 text-sm leading-6 text-emerald-900/80">
          회사 정보에 변경이 필요한 경우 해당 회사를 선택한 뒤 ‘정보 변경 요청’을 이용해 주세요.
        </p>
      </div>

      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-950">관리 중인 회사</h2>
          <p className="mt-1 text-sm text-stone-500">소유주와 관리권한을 구분하여 표시합니다.</p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-600">총 {demoCompanies.length}개</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {demoCompanies.map((company) => (
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
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${company.permission === "소유주" ? "bg-emerald-100 text-emerald-900" : "bg-blue-50 text-blue-800"}`}>
                {company.permission}
              </span>
            </div>
            <dl className="mt-5 grid gap-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-stone-500">법인등록번호</dt><dd className="font-medium text-stone-800">{company.registrationNumber}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">최근 정보</dt><dd className="font-medium text-stone-800">{company.updatedAt}</dd></div>
            </dl>
            <div className="mt-5 border-t border-stone-100 pt-4 text-sm font-bold text-emerald-900">회사 정보 보기 →</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-stone-200 pt-6 text-sm">
        <p className="text-stone-500">실제 연결 후 승인된 회원에게 부여된 회사만 자동 표시됩니다.</p>
        <Link href="/change-password" className="font-semibold text-emerald-900">비밀번호 변경</Link>
      </div>
    </AccountShell>
  );
}
