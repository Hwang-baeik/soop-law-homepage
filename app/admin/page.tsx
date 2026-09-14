import { AccountShell } from "../../components/account-shell";

export default function AdminPage() {
  return (
    <AccountShell title="관리자 · 회원관리" description="가입 신청 승인과 회원 상태를 관리하는 관리자 전용 화면입니다.">
      <div className="rounded-2xl border border-stone-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] gap-4 bg-stone-100 p-4 text-sm font-bold"><span>가입 신청</span><span>처리</span></div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 p-5">
          <div><p className="font-semibold">승인 대기 회원이 여기에 표시됩니다.</p><p className="mt-1 text-sm text-stone-500">회사명 · 가입자 · 법인등록번호 · 연락처 · 신청일</p></div>
          <div className="flex gap-2"><button disabled className="rounded-lg bg-emerald-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">승인</button><button disabled className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold disabled:opacity-40">거절</button></div>
        </div>
      </div>
      <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-900">관리자 권한은 공개 회원가입으로 부여하지 않습니다. 인증 연결 후 서버에서 role=admin인 승인 계정만 이 경로에 접근하도록 차단합니다.</p>
    </AccountShell>
  );
}
