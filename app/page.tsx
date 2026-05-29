"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  FileText,
  Scale,
  MapPin,
  Phone,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ClipboardCheck,
  Users,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import Link from "next/link";


const office = {
  name: "숲 법무사 사무소",
  partners: "법무사 황배익 · 법무사 김지안",
  address: "서울 성동구 연무장5가길 25, 315호",
  phone: "02-6956-8683",
  email: "soop_lawoffice@naver.com",
  kakao: "https://pf.kakao.com/_cZxddX",
  businessNumber: "478-02-02146",
};

const services = [
  {
    icon: Building2,
    title: "법인등기",
    href: "/board?category=법인등기%20절차",
    desc: "설립, 임원변경, 본점이전, 증자·감자, 정관변경 등",
  },
  {
    icon: FileText,
    title: "민사서류",
    href: "/board?category=민사서류%20절차",
    desc: "내용증명, 지급명령, 소장, 신청서 작성 등",
  },
  {
    icon: Scale,
    title: "민사집행",
    href: "/board?category=민사집행%20절차",
    desc: "압류, 추심, 강제집행 등",
  },
];

const strengths = [
  "절차별 체크리스트 기반 검토",
  "법인·부동산 등기 실무 중심 대응",
  "성동구·성수동 지역 접근성",
  "필요서류, 세금, 일정까지 한 번에 정리",
];

const process = [
  "상담 및 사실관계 확인",
  "필요서류·비용·일정 안내",
  "서류 작성 및 사전 검토",
  "접수·보정 대응·완료 보고",
];

const privacyPolicy = `숲 법무사 사무소(이하 ‘사무소’라 합니다)는 개인정보 보호법 제30조에 따라 정보주체의 개인정보를 보호하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.

제1조 (개인정보의 처리목적)
사무소는 상담 신청 접수, 의뢰 내용 확인, 상담 일정 조율, 사건 검토 및 고충 처리를 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 위 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법 등 관계 법령에 따라 필요한 조치를 이행합니다.

제2조 (처리하는 개인정보 항목)
사무소는 상담 신청 과정에서 회사명, 담당자명, 직무, 직급·직책, 회사 이메일, 전화번호, 요청내용, 직원 수, 업종, 매출액 등 상담에 필요한 정보를 처리할 수 있습니다.

제3조 (개인정보의 처리 및 보유기간)
상담 신청을 통해 수집된 개인정보는 상담 및 사건 검토 목적 달성 시까지 보유·이용하며, 관계 법령에 따라 보존할 필요가 있는 경우에는 해당 법령에서 정한 기간 동안 보관합니다.

제4조 (개인정보의 제3자 제공)
사무소는 정보주체의 동의가 있거나 법률에 특별한 규정이 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.

제5조 (정보주체의 권리)
정보주체는 사무소에 대해 개인정보 열람, 정정, 삭제, 처리정지를 요구할 수 있으며, 사무소는 관계 법령에 따라 지체 없이 조치합니다.

제6조 (개인정보 보호책임자)
개인정보 보호 및 관련 문의는 숲 법무사 사무소로 연락하실 수 있습니다.
전화: 02-6956-8683
이메일: soop_lawoffice@naver.com`;

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <img
      src={compact ? "/soop-logo-mark.png" : "/soop-logo-horizontal.png"}
      alt="숲 법무사사무소 로고"
      className={compact ? "h-12 w-auto" : "h-10 w-auto sm:h-12 md:h-14"}
    />
  );
}

function ConsultationForm() {
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

    if (!form.agree) {
      setSubmitMessage("개인정보 수집 및 이용에 동의해 주세요.");
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

      if (!response.ok) {
        throw new Error("상담 신청 전송에 실패했습니다.");
      }

      setSubmitMessage("상담 신청이 정상적으로 접수되었습니다.");
      setForm({
        email: "",
        nameOrCompany: "",
        category: "",
        message: "",
        agree: false,
      });
    } catch {
      setSubmitMessage("전송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 grid gap-5 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm md:p-8"
    >
      <label className="grid gap-2 text-sm font-semibold text-stone-700">
        메일주소 <span className="text-red-600">*</span>
        <input
          required
          type="email"
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
          value={form.category}
          onChange={(e) => updateField("category", e.target.value)}
          className="h-11 rounded-xl border border-stone-300 px-4 outline-none focus:border-emerald-800"
        >
          <option value="">선택</option>
          <option>법인등기</option>
          <option>부동산등기</option>
          <option>법원 서류</option>
          <option>고소장</option>
          <option>기타</option>
        </select>
      </label>

      <label className="grid gap-2 text-sm font-semibold text-stone-700">
        문의 내용 <span className="text-red-600">*</span>
        <textarea
          required
          value={form.message}
          onChange={(e) => updateField("message", e.target.value)}
          rows={8}
          className="rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-800"
          placeholder="문의해주실 내용을 입력해 주세요"
        />
      </label>

      <div className="max-h-48 overflow-y-auto rounded-2xl bg-stone-50 p-5 text-sm leading-7 text-stone-700">
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

      {submitMessage && (
        <p className="text-center text-sm font-medium text-stone-700">{submitMessage}</p>
      )}
    </form>
  );
}

export default function SoopLawOfficeHomepage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <LogoMark />
          <nav className="hidden items-center gap-8 text-sm font-medium text-stone-600 md:flex">
            <a href="#services" className="hover:text-stone-950">업무분야</a>
            <a href="#strength" className="hover:text-stone-950">강점</a>
            <a href="#process" className="hover:text-stone-950">진행절차</a>
            <a href="#contact" className="hover:text-stone-950">상담안내</a>
          </nav>
          <Button className="rounded-full bg-emerald-900 px-5 hover:bg-emerald-950">
            상담 문의
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-br from-stone-50 via-white to-emerald-50">
          <div className="pointer-events-none absolute right-[-8rem] top-[-8rem] hidden h-80 w-80 rounded-full bg-emerald-100/60 blur-3xl md:block" />
          <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 py-14 md:grid-cols-[1.05fr_0.95fr] md:py-32">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="mb-8 inline-flex rounded-[1.75rem] border border-emerald-100 bg-white px-5 py-4 shadow-sm md:px-6 md:py-5">
                <LogoMark />
              </div>
              <div className="mb-5 inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-900 shadow-sm">
                성동구·성수동 법인등기 및 부동산등기 실무 사무소
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">
                복잡한 등기 절차를
                <br />
                정확하고 차분하게 정리합니다.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
                {office.name}는 법인등기, 부동산등기, 상속절차, 민사 신청서류 작성까지
                의뢰인의 상황에 맞추어 필요한 절차와 위험요소를 사전에 점검합니다.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="tel:02-6956-8683"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-900 px-7 text-base font-semibold text-white transition hover:bg-emerald-950"
                >
                  전화 상담하기 <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <Button variant="outline" className="h-12 rounded-full border-stone-300 px-7 text-base">
                  업무분야 보기
                </Button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}>
              <Card className="rounded-[2rem] border-stone-200 bg-white/90 shadow-xl">
                <CardContent className="p-8">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-900 text-white">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-bold">사건별 핵심 검토</h2>
                  <p className="mt-3 leading-7 text-stone-600">
                    단순 접수 대행이 아니라, 결의기관·공고·첨부서면·세무상 검토사항을 함께 확인하여
                    보정 가능성을 줄이는 방식으로 진행합니다.
                  </p>
                  <div className="mt-8 grid gap-4">
                    {strengths.map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" />
                        <span className="text-sm font-medium text-stone-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        <section className="border-b border-stone-200 bg-white py-16 md:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-[0.95fr_1.05fr] md:items-center">
            <div>
              <p className="font-semibold text-emerald-900">For Professionals</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                전문가의 실무 파트너로도 함께합니다.
              </h2>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 md:p-8">
              <p className="text-base leading-8 text-stone-700">
                숲 법무사 사무소는 세무사, 노무사, 변호사 등 여러 전문가들과 함께 실무를
                진행해 왔습니다. 고객 업무 중 법무 처리나 등기 절차가 필요한 사안이 있다면,
                기존 자문 흐름을 해치지 않도록 필요한 범위를 정리해 차분하게 지원합니다.
              </p>
              <div className="mt-6 grid gap-3 text-sm font-medium text-stone-700 sm:grid-cols-3">
                {["법인·부동산 등기", "민사 신청서류", "절차·서류 검토"].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 border-l border-emerald-800/30 pl-3"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-900" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="font-semibold text-emerald-900">Practice Areas</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">주요 업무분야</h2>
            <p className="mt-4 leading-7 text-stone-600">
              법률관계와 등기절차가 맞물리는 업무를 중심으로, 필요한 서류와 결의 절차를 정리합니다.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {services.map(({ icon: Icon, title, desc, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="p-6">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-900">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-stone-600">{desc}</p>
                  </div>
                </Link>
            ))}
          </div>
          <Link
            href="/board"
            className="mt-8 flex flex-col gap-5 rounded-2xl border border-emerald-900/15 bg-emerald-950 px-6 py-6 text-white shadow-sm transition hover:bg-emerald-900 md:flex-row md:items-center md:justify-between md:px-8"
          >
            <div>
              <p className="text-sm font-semibold text-emerald-100">업무 안내 자료</p>
              <p className="mt-2 max-w-2xl text-lg font-bold leading-7">
                각 업무의 절차와 준비서류가 궁금하다면 정리된 안내글을 확인해 보세요.
              </p>
            </div>
            <span className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-emerald-950">
              안내글 보기 <ArrowRight className="ml-2 h-4 w-4" />
            </span>
          </Link>
        </section>

        <section id="strength" className="bg-white py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-2">
            <div>
              <p className="font-semibold text-emerald-900">Why SOOP</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">문서 하나보다 절차 전체를 봅니다.</h2>
              <p className="mt-5 leading-8 text-stone-600">
                등기 업무는 신청서 작성만으로 끝나지 않습니다. 의사결정 구조, 공고 여부,
                이해관계자 동의, 첨부서면, 세금, 향후 분쟁 가능성까지 함께 보아야 합니다.
              </p>
            </div>
            <div className="grid gap-4">
              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
                <ClipboardCheck className="mb-4 h-7 w-7 text-emerald-900" />
                <h3 className="text-lg font-bold">체크리스트형 진행</h3>
                <p className="mt-2 text-sm leading-7 text-stone-600">사건별 누락 가능 서류와 보정 가능 지점을 선제적으로 확인합니다.</p>
              </div>
              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
                <Users className="mb-4 h-7 w-7 text-emerald-900" />
                <h3 className="text-lg font-bold">공동 검토 체계</h3>
                <p className="mt-2 text-sm leading-7 text-stone-600">복잡한 사안은 내부 검토를 거쳐 실무상 가능한 방향을 정리합니다.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="process" className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10 max-w-2xl">
            <p className="font-semibold text-emerald-900">Process</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">진행 절차</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {process.map((step, idx) => (
              <div key={step} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-900 text-sm font-bold text-white">
                  {idx + 1}
                </div>
                <h3 className="font-bold">{step}</h3>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-stone-200 bg-white py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-10 max-w-2xl">
              <p className="font-semibold text-emerald-900">Location</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">오시는 길</h2>
              <p className="mt-4 leading-7 text-stone-600">
                서울 성동구 연무장5가길 25, 315호 숲 법무사 사무소
              </p>
            </div>

            <div className="grid items-center gap-8 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_2fr]">
              <div className="overflow-hidden rounded-3xl border border-stone-200 bg-stone-50 shadow-sm">
                <img
                  src="/soop-office-map.PNG"
                  alt="숲 법무사 사무소 위치 지도"
                  className="h-auto w-full object-contain"
                />
              </div>

              <div className="flex flex-col justify-center gap-4 md:pl-4">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">숲 법무사 사무소 위치</h3>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    성수역 인근, 서울 성동구 연무장5가길 25, 315호에 위치하고 있습니다.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://map.naver.com/p/search/서울%20성동구%20연무장5가길%2025"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-950"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black text-emerald-900">N</span>
                    네이버지도에서 보기
                  </a>

                  <a
                    href="https://map.kakao.com/link/search/서울 성동구 연무장5가길 25"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-300 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-yellow-400"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-xs font-black text-yellow-300">K</span>
                    카카오맵에서 보기
                  </a>

                  <a
                    href="https://www.google.com/maps/search/?api=1&query=서울%20성동구%20연무장5가길%2025"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 bg-white text-xs font-black text-stone-700">G</span>
                    구글맵에서 보기
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="consultation" className="bg-stone-50 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="max-w-2xl">
              <p className="font-semibold text-emerald-900">Consultation</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">상담 신청</h2>
              <p className="mt-4 leading-7 text-stone-600">
                아래 내용을 작성하면 입력하신 내용이 이메일 형식으로 정리되어 사무소 메일로 발송됩니다.
              </p>
            </div>
            <ConsultationForm />
          </div>
        </section>

        <section id="contact" className="bg-emerald-950 py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="font-semibold text-emerald-200">Contact</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">상담이 필요하시면 연락 주십시오.</h2>
              <p className="mt-5 max-w-2xl leading-8 text-emerald-50/80">
                상담 전 사건의 종류, 당사자 정보, 현재 진행 단계, 보유 서류를 알려주시면 보다 정확한 안내가 가능합니다.
              </p>
            </div>
            <Card className="rounded-3xl border-white/10 bg-white text-stone-900 shadow-xl">
              <CardContent className="p-7">
                <h3 className="text-2xl font-bold">{office.name}</h3>
                <p className="mt-2 text-stone-600">{office.partners}</p>
                <div className="mt-6 space-y-4 text-sm">
                  <div className="flex gap-3">
                    <Phone className="h-5 w-5 text-emerald-900" />
                    <span className="font-semibold">{office.phone}</span>
                  </div>
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 text-emerald-900" />
                    <span>{office.address}</span>
                  </div>
                  <div className="flex gap-3">
                    <FileText className="h-5 w-5 text-emerald-900" />
                    <span>{office.email}</span>
                  </div>
                </div>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <a
                    href="tel:02-6956-8683"
                    className="flex h-12 items-center justify-center rounded-full bg-emerald-900 text-base font-semibold text-white transition hover:bg-emerald-950"
                  >
                    전화 상담
                  </a>
                  <a href={office.kakao} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center rounded-full border border-stone-300 text-base font-semibold text-stone-800 transition hover:bg-stone-50">
                    카카오톡 상담
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-stone-950 px-6 py-10 text-stone-300">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex rounded-2xl bg-white px-5 py-4">
                <LogoMark />
              </div>
              <p className="mt-4 text-sm text-stone-400">정확한 절차 검토와 신뢰 있는 등기·서류 업무</p>
            </div>
            <div className="grid gap-2 text-sm leading-6 md:text-right">
              <div>대표 법무사: 황배익 · 김지안</div>
              <div>사업자등록번호: {office.businessNumber}</div>
              <div>주소: {office.address}</div>
              <div>전화: {office.phone}</div>
              <div>이메일: {office.email}</div>
              <div>
                카카오톡 매장톡: <a href={office.kakao} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-white">바로가기</a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-xs text-stone-500">
            © {new Date().getFullYear()} {office.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
