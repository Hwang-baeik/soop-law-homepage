"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../components/account-shell";
import { CORPORATE_NUMBER_PATTERN, PASSWORD_PATTERN } from "../../lib/member-types";

export default function SignupPage() {
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const corporateNumber = String(data.get("corporateNumber") ?? "").replace(/-/g, "");
    const password = String(data.get("password") ?? "");
    if (!CORPORATE_NUMBER_PATTERN.test(corporateNumber)) return setMessage("법인등록번호는 숫자 13자리로 입력해 주세요.");
    if (!PASSWORD_PATTERN.test(password)) return setMessage("비밀번호는 영문, 숫자, 특수문자를 포함하여 8자리 이상이어야 합니다.");
    setMessage("회원 시스템 연결 준비가 완료되었습니다. 데이터베이스 연결 후 가입 신청이 저장됩니다.");
  }

  return (
    <AccountShell title="법인회원 가입" description="가입 신청 후 숲 법무사 사무소의 승인을 받아야 마이페이지를 이용할 수 있습니다.">
      <form onSubmit={submit} className="grid gap-5">
        <label className="grid gap-2 text-sm font-semibold">회사명<input name="companyName" required className={fieldClassName} /></label>
        <label className="grid gap-2 text-sm font-semibold">가입자 명<input name="applicantName" required className={fieldClassName} /></label>
        <label className="grid gap-2 text-sm font-semibold">법인등록번호<input name="corporateNumber" required inputMode="numeric" maxLength={13} className={fieldClassName} placeholder="숫자 13자리" /></label>
        <label className="grid gap-2 text-sm font-semibold">연락처<input name="phone" required type="tel" className={fieldClassName} placeholder="010-0000-0000" /></label>
        <label className="grid gap-2 text-sm font-semibold">비밀번호<input name="password" required type="password" className={fieldClassName} placeholder="영문·숫자·특수문자 포함 8자리 이상" /></label>
        <button className={primaryButtonClassName}>가입 승인 요청</button>
        {message && <p className="rounded-xl bg-stone-100 p-4 text-sm leading-6 text-stone-700">{message}</p>}
      </form>
      <p className="mt-6 text-center text-sm text-stone-600">이미 계정이 있으신가요? <Link href="/login" className="font-semibold text-emerald-900">로그인</Link></p>
    </AccountShell>
  );
}
