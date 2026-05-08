import React from "react";
import { motion } from "framer-motion";
import { Building2, FileText, Home, Scale, MapPin, Phone, CheckCircle2, ArrowRight, ShieldCheck, ClipboardCheck, Users } from "lucide-react";

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
    desc: "설립, 임원변경, 본점이전, 증자·감자, 정관변경, 종류주식 등 법인 절차를 정확하게 검토합니다.",
  },
  {
    icon: Home,
    title: "부동산등기",
    desc: "소유권이전, 근저당권, 상속·증여, 말소, 가등기 등 권리관계에 맞는 등기 절차를 진행합니다.",
  },
  {
    icon: FileText,
    title: "상속·가족관계 절차",
    desc: "상속등기, 상속포기, 한정승인, 가족관계 서류 검토 등 사안별 위험요소를 함께 점검합니다.",
  },
  {
    icon: Scale,
    title: "민사 신청·서류 작성",
    desc: "지급명령, 내용증명, 제소전화해, 각종 신청서 작성 등 실무형 문서 업무를 지원합니다.",
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

export default function SoopLawOfficeHomepage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-bold tracking-tight">{office.name}</div>
            <div className="text-xs text-stone-500">SOOP Judicial Scrivener Office</div>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-stone-600 md:flex">
            <a href="#services" className="hover:text-stone-950">업무분야</a>
            <a href="#strength" className="hover:text-stone-950">강점</a>
            <a href="#process" className="hover:text-stone-950">진행절차</a>
            <a href="#contact" className="hover:text-stone-950">상담안내</a>
          </nav>
          <button type="button" className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-950">
            상담 문의
          </button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-br from-stone-100 via-white to-emerald-50">
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-emerald-100 blur-3xl" />
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-[1.05fr_0.95fr] md:py-32">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="mb-5 inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-900">
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
                <button type="button" className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-900 px-7 text-base font-semibold text-white transition hover:bg-emerald-950">
                  전화 상담하기 <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                <button type="button" className="inline-flex h-12 items-center justify-center rounded-full border border-stone-300 bg-white px-7 text-base font-semibold text-stone-900 transition hover:bg-stone-50">
                  업무분야 보기
                </button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}>
              <div className="rounded-[2rem] border border-stone-200 bg-white/90 shadow-xl">
                <div className="p-8">
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
                </div>
              </div>
            </motion.div>
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
            {services.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-900">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
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

        <section id="contact" className="bg-emerald-950 py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="font-semibold text-emerald-200">Contact</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">상담이 필요하시면 연락 주십시오.</h2>
              <p className="mt-5 max-w-2xl leading-8 text-emerald-50/80">
                상담 전 사건의 종류, 당사자 정보, 현재 진행 단계, 보유 서류를 알려주시면 보다 정확한 안내가 가능합니다.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white text-stone-900 shadow-xl">
              <div className="p-7">
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
                  <button type="button" className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-900 text-base font-semibold text-white transition hover:bg-emerald-950">
                    전화 상담
                  </button>
                  <a href={office.kakao} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center rounded-full border border-stone-300 text-base font-semibold text-stone-800 transition hover:bg-stone-50">
                    카카오톡 상담
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-stone-950 px-6 py-10 text-stone-300">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-lg font-bold text-white">{office.name}</div>
              <p className="mt-2 text-sm text-stone-400">정확한 절차 검토와 신뢰 있는 등기·서류 업무</p>
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
