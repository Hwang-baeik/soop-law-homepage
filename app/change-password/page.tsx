"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../components/account-shell";
import { PASSWORD_PATTERN } from "../../lib/member-types";
import { clearSession, getSession, signOut, updatePassword, verifyAccountPassword } from "../../lib/supabase-browser";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const check = () => {
      const hasSession = Boolean(getSession());
      setAuthenticated(hasSession);
      if (!hasSession) router.replace("/login");
    };
    check();
    window.addEventListener("soop-auth-changed", check);
    return () => window.removeEventListener("soop-auth-changed", check);
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || completed) return;
    const session = getSession();
    if (!session?.user?.email) { router.replace("/login"); return; }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (!PASSWORD_PATTERN.test(newPassword)) return setMessage("새 비밀번호는 영문, 숫자, 특수문자를 포함하여 12자리 이상이어야 합니다.");
    if (newPassword !== confirmPassword) return setMessage("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
    if (currentPassword === newPassword) return setMessage("기존 비밀번호와 다른 비밀번호를 사용해 주세요.");

    try {
      lock.current = true;
      setSubmitting(true);
      setMessage("");
      const userId = await verifyAccountPassword(currentPassword);
      const current = getSession();
      if (!current || current.user.id !== userId) throw new Error("로그인 계정이 변경되었습니다. 다시 확인해 주세요.");
      await updatePassword(current.access_token, newPassword, currentPassword);
      formElement.reset();
      setCompleted(true);
      setMessage("비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.");
      await signOut().catch(() => clearSession());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "비밀번호 변경 중 오류가 발생했습니다.");
    } finally { setSubmitting(false); lock.current = false; }
  }

  if (!authenticated && !completed) return <p role="status" className="p-8 text-center text-sm">로그인 상태를 확인하고 있습니다.</p>;

  return (
    <AccountShell title="비밀번호 변경" description="기존 비밀번호를 확인한 후 새 비밀번호로 변경합니다. 변경 후에는 다시 로그인해야 합니다.">
      {completed ? <div><p role="status" className="rounded-xl bg-emerald-50 p-5 text-sm leading-7 text-emerald-950">{message}</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-emerald-900 px-5 py-3 font-semibold text-white">새 비밀번호로 로그인</Link></div> : <>
      <p className="mb-5 text-sm leading-7 text-stone-600">2단계 인증을 사용하는 계정은 먼저 보안 메뉴에서 인증을 완료해 주세요. 관리자가 만든 계정은 최초 로그인 시 반드시 비밀번호를 변경해야 합니다.</p>
      <form onSubmit={submit} className="grid gap-5">
        <label className="grid gap-2 text-sm font-semibold">기존 비밀번호<input name="currentPassword" required type="password" className={fieldClassName} autoComplete="current-password" /></label>
        <label className="grid gap-2 text-sm font-semibold">새 비밀번호<input name="newPassword" required type="password" className={fieldClassName} autoComplete="new-password" placeholder="영문·숫자·특수문자 포함 12자리 이상" /></label>
        <label className="grid gap-2 text-sm font-semibold">새 비밀번호 확인<input name="confirmPassword" required type="password" className={fieldClassName} autoComplete="new-password" /></label>
        <button disabled={submitting} className={primaryButtonClassName}>{submitting ? "변경 중..." : "비밀번호 변경"}</button>
        {message && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">{message}</p>}
      </form>
      <Link href="/account-settings" className="mt-6 inline-flex text-sm font-semibold text-emerald-900">← 마이페이지</Link>
      </>}
    </AccountShell>
  );
}
