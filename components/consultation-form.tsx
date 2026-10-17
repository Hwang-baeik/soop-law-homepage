"use client";

import React, { useState } from "react";
import { contactCategories, contactLimits, validateContact } from "../lib/contact";

const privacyPolicy = `숲 법무사 사무소(이하 ‘사무소’라 합니다)는 개인정보 보호법 제30조에 따라 정보주체의 개인정보를 보호하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.

제1조 (개인정보의 처리목적)
사무소는 상담 신청 접수, 의뢰 내용 확인, 상담 일정 조율, 사건 검토 및 고충 처리를 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 위 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법 등 관계 법령에 따라 필요한 조치를 이행합니다.

제2조 (처리하는 개인정보 항목)
사무소는 상담 신청 과정에서 메일주소, 성명(법인명), 업무 분류, 문의 내용 및 개인정보 수집·이용 동의 여부를 처리할 수 있습니다.

제3조 (개인정보의 처리 및 보유기간)
상담 신청을 통해 수집된 개인정보는 상담 및 사건 검토 목적 달성 시까지 보유·이용하며, 관계 법령에 따라 보존할 필요가 있는 경우에는 해당 법령에서 정한 기간 동안 보관합니다.

제4조 (개인정보의 제3자 제공)
사무소는 정보주체의 동의가 있거나 법률에 특별한 규정이 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.

제5조 (정보주체의 권리)
정보주체는 사무소에 대해 개인정보 열람, 정정, 삭제, 처리정지를 요구할 수 있으며, 사무소는 관계 법령에 따라 지체 없이 조치합니다.

제6조 (개인정보 보호책임자)
개인정보 보호 및 관련 문의는 숲 법무사 사무소로 연락하실 수 있습니다.
전화: 02-6956-8683
이메일: soop@sooplaw.com`;

export function ConsultationForm() {
  const [form, setForm] = useState({
    email: "",
    nameOrCompany: "",
    category: "",
    message: "",
    agree: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const updateField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;
    const validated = validateContact(form);
    if (validated.error) {
      setSubmitMessage(validated.error);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMessage("");

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.message || "상담 신청 전송에 실패했습니다.");
      }

      setSubmitMessage("상담 신청이 정상적으로 접수되었습니다.");
      setForm({
        email: "",
        nameOrCompany: "",
        category: "",
        message: "",
        agree: false,
      });
    } catch (error) {
      setSubmitMessage(error instanceof TypeError ? "통신 오류로 접수 여부를 확인하지 못했습니다. 전화 02-6956-8683으로 문의해 주세요." : error instanceof Error ? error.message : "전송 중 오류가 발생했습니다. 전화 02-6956-8683으로 문의해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={isSubmitting}
      className="mt-10 grid gap-5 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm md:p-8"
    >
      <fieldset disabled={isSubmitting} className="contents">
      <label className="grid gap-2 text-sm font-semibold text-stone-700">
        메일주소 <span className="text-red-600">*</span>
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          maxLength={contactLimits.email}
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          className="h-11 rounded-xl border border-stone-300 px-4 outline-none focus:border-emerald-800"
          placeholder="example@domain.com"
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-stone-700">
        성명(법인명) <span className="text-red-600">*</span>
        <input
          required
          name="nameOrCompany"
          autoComplete="organization"
          maxLength={contactLimits.nameOrCompany}
          value={form.nameOrCompany}
          onChange={(e) => updateField("nameOrCompany", e.target.value)}
          className="h-11 rounded-xl border border-stone-300 px-4 outline-none focus:border-emerald-800"
          placeholder="성명 또는 법인명을 입력해 주세요"
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-stone-700">
        업무 분류 <span className="text-red-600">*</span>
        <select
          required
          name="category"
          value={form.category}
          onChange={(e) => updateField("category", e.target.value)}
          className="h-11 rounded-xl border border-stone-300 px-4 outline-none focus:border-emerald-800"
        >
          <option value="">선택</option>
          {contactCategories.map((category) => <option key={category}>{category}</option>)}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-semibold text-stone-700">
        문의 내용 <span className="text-red-600">*</span>
        <textarea
          required
          name="message"
          maxLength={contactLimits.message}
          aria-describedby="message-help"
          value={form.message}
          onChange={(e) => updateField("message", e.target.value)}
          rows={8}
          className="rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-800"
          placeholder="문의해주실 내용을 입력해 주세요"
        />
      </label>

      <p id="message-help" className="text-sm leading-6 text-stone-600">문의 내용은 5,000자 이내로 입력해 주세요. 주민등록번호, 비밀번호 등 민감한 정보는 입력하지 마십시오.</p>

      <div id="privacy-policy" tabIndex={0} aria-label="개인정보 처리방침" className="max-h-48 overflow-y-auto rounded-2xl bg-stone-50 p-5 text-sm leading-7 text-stone-700">
        {privacyPolicy.split("\n").map((line, index) => (
          <p key={index} 
          className={
            line.startsWith("제") 
              ? "mt-4 font-bold" 
              : ""
          }>
            {line || " "}
          </p>
        ))}
      </div>

      <label className="flex items-center justify-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          required
          name="agree"
          checked={form.agree}
          onChange={(e) => updateField("agree", e.target.checked)}
        />
        개인정보 수집 및 이용에 동의합니다.
      </label>

      <button
        type="submit"
        disabled={!form.agree || isSubmitting}
        className="h-12 rounded-full bg-emerald-900 text-base font-semibold text-white transition hover:bg-emerald-950 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
      >
        {isSubmitting ? "전송 중..." : "상담 제출"}
      </button>

      </fieldset>
      {submitMessage && (
        <p role="status" aria-live="polite" className="text-center text-sm font-medium text-stone-700">{submitMessage}</p>
      )}
    </form>
  );
}

