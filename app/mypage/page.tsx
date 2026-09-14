import Link from "next/link";
import { AccountShell } from "../../components/account-shell";

const menus = [
  ["회사정보", "승인된 법인의 기본정보를 확인합니다."],
  ["등기변경 요청", "임원변경, 본점이전, 증자 등 변경사항을 요청합니다."],
  ["기타 법무 요청", "등기 외 법무 업무를 요청합니다."],
  ["진행현황", "접수된 요청과 사건의 진행상태를 확인합니다."],
];

export default function MyPage() {
  return (
    <AccountShell title="마이페이지" description="법인회원 전용 공간입니다. 실제 사용자 연결 후 본인에게 권한이 부여된 회사 정보만 표시됩니다.">
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-bold text-amber-950">계정 상태: 승인 확인 필요</p>
        <p className="mt-1 text-sm leading-6 text-amber-800">인증 연결 후 승인대기 계정은 이 화면의 회사정보에 접근할 수 없도록 서버에서 차단합니다.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {menus.map(([title, description]) => <div key={title} className="rounded-2xl border border-stone-200 p-5"><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{description}</p></div>)}
      </div>
      <div className="mt-6 text-right"><Link href="/change-password" className="text-sm font-semibold text-emerald-900">비밀번호 변경</Link></div>
    </AccountShell>
  );
}
