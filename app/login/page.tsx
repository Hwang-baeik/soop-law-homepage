import Link from "next/link";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../components/account-shell";

export default function LoginPage() {
  return (
    <AccountShell title="로그인" description="승인된 법인회원과 사무소 구성원이 이용할 수 있습니다.">
      <form className="grid gap-5">
        <label className="grid gap-2 text-sm font-semibold">법인등록번호 또는 아이디<input name="loginId" required className={fieldClassName} autoComplete="username" /></label>
        <label className="grid gap-2 text-sm font-semibold">비밀번호<input name="password" required type="password" className={fieldClassName} autoComplete="current-password" /></label>
        <button type="button" className={primaryButtonClassName}>로그인</button>
      </form>
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
        <Link href="/signup" className="font-semibold text-emerald-900">법인회원 가입</Link>
        <span className="text-stone-300">|</span>
        <Link href="/change-password" className="font-semibold text-stone-700">비밀번호 변경</Link>
      </div>
      <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">현재 화면은 인증 데이터베이스 연결 전 단계입니다. Supabase 연결 후 실제 로그인이 활성화됩니다.</p>
    </AccountShell>
  );
}
