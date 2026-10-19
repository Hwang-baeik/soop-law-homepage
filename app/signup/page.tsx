"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../components/account-shell";
import { CORPORATE_NUMBER_PATTERN, PASSWORD_PATTERN } from "../../lib/member-types";
import { signUp } from "../../lib/supabase-browser";

export default function SignupPage() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const companyName = String(data.get("companyName") ?? "").trim();
    const applicantName = String(data.get("applicantName") ?? "").trim();
    const corporateNumber = String(data.get("corporateNumber") ?? "").replace(/-/g, "");
    const phone = String(data.get("phone") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const passwordConfirm = String(data.get("passwordConfirm") ?? "");
    const privacyConsent = data.get("privacyConsent") === "on";

    if (!CORPORATE_NUMBER_PATTERN.test(corporateNumber)) return setMessage("법인등록번호는 숫자 13자리로 입력해 주세요.");
    if (!PASSWORD_PATTERN.test(password)) return setMessage("비밀번호는 영문, 숫자, 특수문자를 포함하여 12자리 이상이어야 합니다.");
    if (password !== passwordConfirm) return setMessage("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
    if (!privacyConsent) return setMessage("회원서비스 제공을 위한 개인정보 수집·이용에 동의해 주세요.");

    try {
      setSubmitting(true);
      setMessage("");
      await signUp(email, password, {
        display_name: applicantName,
        phone,
        company_name: companyName,
        corporate_registration_number: corporateNumber,
        privacy_consent: "true",
        privacy_consent_version: "2026-09-15",
      });
      form.reset();
      setMessage("가입 신청이 접수되었습니다. 이메일 확인 후 관리자 승인을 기다려 주세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "회원가입 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccountShell title="법인회원 가입" description="가입 신청 후 숲 법무사 사무소의 승인을 받아야 내 회사 정보를 이용할 수 있습니다.">
      <form onSubmit={submit} className="grid gap-5">
        <label className="grid gap-2 text-sm font-semibold">회사명<input name="companyName" required className={fieldClassName} /></label>
        <label className="grid gap-2 text-sm font-semibold">가입자 명<input name="applicantName" required className={fieldClassName} /></label>
        <label className="grid gap-2 text-sm font-semibold">법인등록번호<input name="corporateNumber" required inputMode="numeric" maxLength={13} className={fieldClassName} placeholder="숫자 13자리" /></label>
        <label className="grid gap-2 text-sm font-semibold">연락처<input name="phone" required type="tel" className={fieldClassName} placeholder="010-0000-0000" /></label>
        <label className="grid gap-2 text-sm font-semibold">이메일(로그인 ID)<input name="email" required type="email" className={fieldClassName} autoComplete="email" placeholder="example@company.com" /></label>
        <label className="grid gap-2 text-sm font-semibold">비밀번호<input name="password" required type="password" className={fieldClassName} autoComplete="new-password" placeholder="영문·숫자·특수문자 포함 12자리 이상" /></label>
        <label className="grid gap-2 text-sm font-semibold">비밀번호 확인<input name="passwordConfirm" required type="password" className={fieldClassName} autoComplete="new-password" placeholder="비밀번호를 한 번 더 입력해 주세요" /></label>
        <label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-700">
          <input name="privacyConsent" type="checkbox" className="mt-1" required />
          <span><Link href="/privacy" target="_blank" className="font-bold text-emerald-900 underline">개인정보 처리방침</Link>을 확인했으며, 회원 식별·가입승인·회사 권한관리 등을 위한 개인정보 수집·이용에 동의합니다.</span>
        </label>
        <button disabled={submitting} className={primaryButtonClassName}>{submitting ? "가입 신청 중..." : "가입 승인 요청"}</button>
        {message && <p className="rounded-xl bg-stone-100 p-4 text-sm leading-6 text-stone-700">{message}</p>}
      </form>
      <p className="mt-6 text-center text-sm text-stone-600">이미 계정이 있으신가요? <Link href="/login" className="font-semibold text-emerald-900">로그인</Link></p>
    </AccountShell>
  );
}
