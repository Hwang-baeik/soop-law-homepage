import { AccountShell, fieldClassName, primaryButtonClassName } from "../../components/account-shell";

export default function ChangePasswordPage() {
  return (
    <AccountShell title="비밀번호 변경" description="보안을 위해 기존 비밀번호를 확인한 후 새 비밀번호로 변경합니다.">
      <form className="grid gap-5">
        <label className="grid gap-2 text-sm font-semibold">기존 비밀번호<input required type="password" className={fieldClassName} autoComplete="current-password" /></label>
        <label className="grid gap-2 text-sm font-semibold">새 비밀번호<input required type="password" className={fieldClassName} autoComplete="new-password" placeholder="영문·숫자·특수문자 포함 8자리 이상" /></label>
        <label className="grid gap-2 text-sm font-semibold">새 비밀번호 확인<input required type="password" className={fieldClassName} autoComplete="new-password" /></label>
        <button type="button" className={primaryButtonClassName}>비밀번호 변경</button>
      </form>
    </AccountShell>
  );
}
