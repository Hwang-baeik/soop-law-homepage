"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../../components/account-shell";
import { PASSWORD_PATTERN } from "../../../lib/member-types";
import { signUp } from "../../../lib/supabase-browser";

const ADMIN_EMAIL = "hbi@sooplaw.com";
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

function generatePassword(length = 20) {
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

export default function AdminSetupPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!PASSWORD_PATTERN.test(password)) {
      setMessage("비밀번호는 영문, 숫자, 특수문자를 포함하여 8자리 이상이어야 합니다.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");
      await signUp(ADMIN_EMAIL, password, { display_name: "황배익", phone: "" });
      setMessage("관리자 계정 신청이 완료되었습니다. 관리자 이메일로 도착한 확인 메일을 승인하면 즉시 관리자 계정으로 활성화됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "관리자 계정 생성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccountShell title="관리자 최초 설정" description="숲 법무사 홈페이지의 최초 관리자 계정을 안전하게 생성합니다.">
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        관리자 이메일은 사전에 지정되어 있어 변경할 수 없습니다. 이메일 확인이 완료된 계정만 자동으로 관리자 권한과 승인 상태를 부여받습니다.
      </div>

      <form onSubmit={submit} className="grid gap-5">
        <label className="grid gap-2 text-sm font-semibold">
          관리자 이메일
          <input value={ADMIN_EMAIL} readOnly className={`${fieldClassName} bg-stone-100 text-stone-600`} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          관리자 비밀번호
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" className={fieldClassName} autoComplete="new-password" placeholder="영문·숫자·특수문자 포함 8자리 이상" />
        </label>
        <button type="button" onClick={() => setPassword(generatePassword())} className="h-11 rounded-full border border-stone-300 bg-white px-5 text-sm font-bold text-stone-700 hover:bg-stone-50">
          안전한 비밀번호 자동 생성
        </button>
        {password && <p className="rounded-xl bg-stone-100 p-4 text-sm break-all text-stone-700">생성된 비밀번호: <strong>{password}</strong><br /><span className="text-xs text-stone-500">지금 별도 비밀번호 관리자에 저장한 뒤 계정을 생성해 주세요.</span></p>}
        <button disabled={submitting} className={primaryButtonClassName}>{submitting ? "관리자 계정 생성 중..." : "관리자 계정 생성"}</button>
        {message && <p className="rounded-xl bg-stone-100 p-4 text-sm leading-6 text-stone-700">{message}</p>}
      </form>

      <p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold text-emerald-900">로그인 화면으로</Link></p>
    </AccountShell>
  );
}
