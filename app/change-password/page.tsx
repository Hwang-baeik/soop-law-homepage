"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../components/account-shell";
import { PASSWORD_PATTERN } from "../../lib/member-types";
import { getSession, rest, saveSession, signIn, updatePassword } from "../../lib/supabase-browser";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session?.user?.email) {
      router.replace("/login");
      return;
    }

    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (!PASSWORD_PATTERN.test(newPassword)) {
      setMessage("새 비밀번호는 영문, 숫자, 특수문자를 포함하여 8자리 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (currentPassword === newPassword) {
      setMessage("기존 비밀번호와 다른 비밀번호를 사용해 주세요.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const verifiedSession = await signIn(session.user.email, currentPassword);
      await updatePassword(verifiedSession.access_token, newPassword);

      const markResponse = await rest("rpc/mark_password_changed", verifiedSession.access_token, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!markResponse.ok) throw new Error("비밀번호 변경 상태를 저장하지 못했습니다.");

      const profileResponse = await rest(
        `profiles?id=eq.${encodeURIComponent(verifiedSession.user.id)}&select=role,status`,
        verifiedSession.access_token,
      );
      if (!profileResponse.ok) throw new Error("회원 정보를 확인하지 못했습니다.");
      const profiles = await profileResponse.json();
      const profile = profiles?.[0];
      if (!profile || profile.status !== "approved") throw new Error("승인된 회원 정보를 확인하지 못했습니다.");

      saveSession(verifiedSession);
      setMessage("비밀번호가 변경되었습니다.");
      router.replace(profile.role === "admin" ? "/admin" : "/mypage");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccountShell title="비밀번호 변경" description="기존 비밀번호를 확인한 후 새 비밀번호로 변경합니다. 관리자가 만든 계정은 최초 로그인 시 반드시 변경해야 합니다.">
      <form onSubmit={submit} className="grid gap-5">
        <label className="grid gap-2 text-sm font-semibold">기존 비밀번호<input name="currentPassword" required type="password" className={fieldClassName} autoComplete="current-password" /></label>
        <label className="grid gap-2 text-sm font-semibold">새 비밀번호<input name="newPassword" required type="password" className={fieldClassName} autoComplete="new-password" placeholder="영문·숫자·특수문자 포함 8자리 이상" /></label>
        <label className="grid gap-2 text-sm font-semibold">새 비밀번호 확인<input name="confirmPassword" required type="password" className={fieldClassName} autoComplete="new-password" /></label>
        <button disabled={submitting} className={primaryButtonClassName}>{submitting ? "변경 중..." : "비밀번호 변경"}</button>
        {message && <p className="rounded-xl bg-stone-100 p-4 text-sm leading-6 text-stone-700">{message}</p>}
      </form>
    </AccountShell>
  );
}
