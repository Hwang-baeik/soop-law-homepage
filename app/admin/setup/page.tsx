import Link from "next/link";
import { AccountShell } from "../../../components/account-shell";

export default function AdminSetupPage() {
  return (
    <AccountShell title="관리자 최초 설정 완료" description="최초 관리자 계정 구성이 완료되어 이 경로에서는 더 이상 관리자 계정을 생성하지 않습니다.">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm leading-7 text-emerald-950">
        운영 보안을 위해 관리자 최초 생성 기능을 닫았습니다. 기존 관리자 계정으로 로그인해 주세요. 관리자 계정 복구가 필요한 경우에는 Supabase 관리자 콘솔에서 본인확인 후 처리합니다.
      </div>
      <div className="mt-6 flex justify-center">
        <Link href="/login" className="rounded-full bg-emerald-900 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-950">로그인 화면으로</Link>
      </div>
    </AccountShell>
  );
}
