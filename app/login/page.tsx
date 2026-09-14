"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../components/account-shell";
import { saveSession, signIn, rest } from "../../lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      setSubmitting(true);
      setMessage("");
      const session = await signIn(email, password);
      const profileResponse = await rest(`profiles?id=eq.${encodeURIComponent(session.user.id)}&select=role,status`, session.access_token);
      if (!profileResponse.ok) throw new Error("회원 정보를 확인하지 못했습니다.");
      const profiles = await profileResponse.json();
      const profile = profiles?.[0];
      if (!profile) throw new Error("회원 정보가 등록되지 않았습니다.");
      if (profile.status !== "approved") throw new Error("아직 관리자 승인이 완료되지 않았습니다.");

      saveSession(session);
      router.push(profile.role === "admin" ? "/admin" : "/mypage");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccountShell title="로그인" description="승인된 법인회원과 사무소 관리자가 이용할 수 있습니다.">
      <form onSubmit={submit} className="grid gap-5">
        <label className="grid gap-2 text-sm font-semibold">이메일<input name="email" required type="email" className={fieldClassName} autoComplete="username" /></label>
        <label className="grid gap-2 text-sm font-semibold">비밀번호<input name="password" required type="password" className={fieldClassName} autoComplete="current-password" /></label>
        <button disabled={submitting} className={primaryButtonClassName}>{submitting ? "로그인 중..." : "로그인"}</button>
        {message && <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">{message}</p>}
      </form>
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
        <Link href="/signup" className="font-semibold text-emerald-900">법인회원 가입</Link>
        <span className="text-stone-300">|</span>
        <Link href="/change-password" className="font-semibold text-stone-700">비밀번호 변경</Link>
      </div>
    </AccountShell>
  );
}
