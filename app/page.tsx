const navItems = [
  { label: "사무소 소개", href: "/about" },
  { label: "법인등기 절차", href: "/corporate-registration" },
  { label: "민사서류 절차", href: "/civil-documents" },
  { label: "민사집행 절차", href: "/civil-execution" },
  { label: "실무사례", href: "/cases" },
  { label: "자주묻는질문", href: "/faq" },
  { label: "실무 자료실", href: "/resources" },
];

const mainOfficeImage = {
  src: "/images/office-main.jpg",
  alt: "숲 법무사 사무소 상담실 또는 사무소 대표 이미지",
};

const practiceAreas = [
  {
    title: "법인등기 절차",
    href: "/corporate-registration",
    summary:
      "설립, 임원변경, 본점이전, 증자·감자, 정관변경 등 회사 변경사항을 등기절차에 맞추어 검토합니다.",
    tags: ["설립등기", "임원변경", "본점이전", "증자·감자"],
  },
  {
    title: "민사서류 절차",
    href: "/civil-documents",
    summary:
      "지급명령, 내용증명, 합의서, 준비서면 등 사실관계와 증거관계를 바탕으로 문서를 구성합니다.",
    tags: ["지급명령", "내용증명", "청구원인", "증거정리"],
  },
  {
    title: "민사집행 절차",
    href: "/civil-execution",
    summary:
      "채권압류, 강제집행, 명도, 보전처분 등 권리실현을 위한 절차를 단계별로 검토합니다.",
    tags: ["채권압류", "강제집행", "명도", "보전처분"],
  },
];

const recentPosts = [
  {
    category: "법인등기",
    title: "주식회사 설립등기 절차와 준비서류",
    summary:
      "발기설립을 기준으로 정관, 주식인수, 임원 선임, 본점, 목적 기재사항을 정리합니다.",
    href: "/resources/incorporation-checklist",
  },
  {
    category: "법인등기",
    title: "대표이사 변경등기 기한과 과태료 검토",
    summary:
      "취임, 중임, 사임, 해임 등 사유별 등기기간과 실무상 확인사항을 정리합니다.",
    href: "/resources/director-change-period",
  },
  {
    category: "민사서류",
    title: "지급명령 신청 전 확인해야 할 자료",
    summary:
      "계약서, 세금계산서, 입금내역, 문자·카카오톡 대화 등 기본 증거자료를 확인합니다.",
    href: "/resources/payment-order-evidence",
  },
];

const faqs = [
  {
    question: "대표이사 변경등기는 언제까지 해야 하나요?",
    answer:
      "변경 사유가 발생한 날부터 원칙적으로 2주 이내 등기신청 여부를 검토해야 합니다.",
  },
  {
    question: "법인설립 상담 전에 어떤 자료를 준비해야 하나요?",
    answer:
      "상호, 본점 주소, 목적, 자본금, 임원 구성, 주주 구성, 사업자등록 예정 내용을 미리 정리하면 절차가 빠릅니다.",
  },
  {
    question: "지급명령 이후 이의신청이 들어오면 어떻게 되나요?",
    answer:
      "상대방이 적법하게 이의신청을 하면 통상 소송절차로 이행되므로, 청구원인과 증거 정리가 중요합니다.",
  },
];

const privacyPolicy = `개인정보 수집 및 이용 안내

숲 법무사 사무소는 상담 신청 접수, 의뢰 내용 확인, 상담 일정 조율 및 사건 검토를 위하여 개인정보를 수집·이용합니다.

제1조 수집 항목
성명, 회사명, 연락처, 이메일, 상담 요청 내용, 사건 관련 기본자료를 수집할 수 있습니다.

제2조 이용 목적
상담 신청 확인, 사건 검토, 상담 일정 조율, 의뢰인 응대 및 업무 수행 가능성 검토를 위하여 이용합니다.

제3조 보유 기간
수집된 개인정보는 상담 및 사건 검토 목적 달성 후 관련 법령 또는 내부 기준에 따라 필요한 기간 동안 보관 후 파기합니다.

제4조 동의 거부 권리
정보주체는 개인정보 수집 및 이용에 대한 동의를 거부할 수 있습니다. 다만 동의하지 않을 경우 상담 신청 및 사건 검토가 제한될 수 있습니다.`;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#1f2a24]">
      <header className="sticky top-0 z-50 border-b border-[#d9ded5] bg-[#f7f8f5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#163326] text-xl font-bold text-white">
              숲
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">
                숲 법무사 사무소
              </p>
              <p className="text-xs text-[#6d776f]">
                법인등기 · 민사서류 · 민사집행
              </p>
            </div>
          </a>

          <nav className="hidden items-center gap-6 text-sm text-[#4f5d54] lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="transition hover:text-[#163326]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <a
            href="/contact"
            className="rounded-full bg-[#163326] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#244f3c]"
          >
            상담문의
          </a>
        </div>
      </header>

      <section className="border-b border-[#d9ded5]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:py-28">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-[#cbd4cc] bg-white px-4 py-2 text-sm text-[#536358]">
              실무 중심 · 절차 중심 · 문서 중심
            </p>

            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-[#102219] sm:text-5xl lg:text-6xl">
              법인등기와 민사실무,
              <br />
              필요한 절차부터 정확히 확인합니다.
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-[#526257] sm:text-lg">
              숲 법무사 사무소는 회사의 등기 절차와 민사 실무 문서를
              검토합니다. 복잡한 설명보다 필요한 자료, 절차, 기한, 서류를
              기준으로 정리합니다.
            </p>

            <form
              action="/resources"
              className="mt-8 flex max-w-2xl flex-col gap-3 rounded-3xl border border-[#d9ded5] bg-white p-3 shadow-sm sm:flex-row"
            >
              <input
                name="q"
                type="search"
                placeholder="찾고 싶은 절차나 실무 내용을 검색해보세요."
                className="min-h-12 flex-1 rounded-2xl border border-transparent px-4 text-sm outline-none placeholder:text-[#8b948d] focus:border-[#b7c3ba]"
              />
              <button
                type="submit"
                className="min-h-12 rounded-2xl bg-[#163326] px-6 text-sm font-medium text-white transition hover:bg-[#244f3c]"
              >
                검색
              </button>
            </form>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-[#596b60]">
              <span className="rounded-full bg-white px-4 py-2">
                #법인설립
              </span>
              <span className="rounded-full bg-white px-4 py-2">
                #임원변경
              </span>
              <span className="rounded-full bg-white px-4 py-2">
                #지급명령
              </span>
              <span className="rounded-full bg-white px-4 py-2">
                #채권압류
              </span>
            </div>
          </div>

      <div className="rounded-[2rem] border border-[#d9ded5] bg-white p-5 shadow-xl shadow-[#d9ded5]/60">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-[#e5ebe4]">
          <img
            src={mainOfficeImage.src}
            alt={mainOfficeImage.alt}
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#102219]/70 via-[#102219]/20 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 text-2xl font-bold text-[#163326]">
              숲
            </div>
            <p className="text-2xl font-semibold">숲 법무사 사무소</p>
            <p className="mt-2 text-sm leading-6 text-white/85">
              법인등기 · 민사서류 · 민사집행 절차를 실무적으로 검토합니다.
            </p>
          </div>
        </div>
      </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-18">
        <div className="mb-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-[#66746b]">
              PRACTICE AREAS
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#102219]">
              주요 업무 바로가기
            </h2>
          </div>
          <p className="max-w-xl leading-7 text-[#526257]">
            업무별 상세페이지에서는 개요, 해당되는 경우, 절차, 필요서류,
            실무상 유의점, 자주 묻는 질문 순서로 정리합니다.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {practiceAreas.map((area) => (
            <a
              key={area.title}
              href={area.href}
              className="group rounded-3xl border border-[#d9ded5] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163326] text-lg font-semibold text-white">
                {area.title.slice(0, 1)}
              </div>
              <h3 className="text-2xl font-semibold text-[#102219]">
                {area.title}
              </h3>
              <p className="mt-4 min-h-28 leading-7 text-[#526257]">
                {area.summary}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {area.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#eef2ed] px-3 py-1 text-xs text-[#596b60]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-6 text-sm font-semibold text-[#163326]">
                자세히 보기 →
              </p>
            </a>
          ))}
        </div>
      </section>

      <section className="border-y border-[#d9ded5] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-18">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="mb-3 text-sm font-semibold tracking-wide text-[#66746b]">
                RECENT CONTENTS
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-[#102219]">
                최신 실무 콘텐츠
              </h2>
            </div>
            <a
              href="/resources"
              className="hidden rounded-full border border-[#cbd4cc] px-5 py-2.5 text-sm font-medium text-[#163326] transition hover:bg-[#eef2ed] sm:inline-flex"
            >
              전체 글 보기
            </a>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {recentPosts.map((post) => (
              <a
                key={post.title}
                href={post.href}
                className="rounded-3xl border border-[#d9ded5] bg-[#f7f8f5] p-7 transition hover:bg-white hover:shadow-md"
              >
                <p className="mb-5 text-sm font-semibold text-[#66746b]">
                  {post.category}
                </p>
                <h3 className="text-xl font-semibold leading-7 text-[#102219]">
                  {post.title}
                </h3>
                <p className="mt-4 leading-7 text-[#526257]">
                  {post.summary}
                </p>
                <p className="mt-6 text-sm font-semibold text-[#163326]">
                  읽어보기 →
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-18">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-[#66746b]">
              FAQ
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#102219]">
              자주 묻는 질문
            </h2>
            <p className="mt-5 leading-7 text-[#526257]">
              실제 상담에서 자주 확인하는 절차와 기한, 준비자료를 중심으로
              정리합니다.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-3xl border border-[#d9ded5] bg-white p-6"
              >
                <h3 className="font-semibold text-[#102219]">
                  Q. {faq.question}
                </h3>
                <p className="mt-3 leading-7 text-[#526257]">
                  A. {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#163326] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-18 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-[#b7c3ba]">
              CONTACT
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              상담 전 자료를 먼저 확인하면 절차가 명확해집니다.
            </h2>
            <p className="mt-6 max-w-2xl leading-8 text-[#d9e0da]">
              회사명, 등기부등본, 정관, 주주명부, 변경하고자 하는 사항을
              보내주시면 필요한 절차와 준비서류를 검토합니다.
            </p>

            <div className="mt-8 space-y-3 text-[#e8eee8]">
              <p>전화: 02-6956-8683</p>
              <p>주소: 서울 성동구 연무장5가길 25, 315호</p>
            </div>

            <a
              href="/contact"
              className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#163326] transition hover:bg-[#eef2ed]"
            >
              상담문의 작성하기
            </a>
          </div>

          <div className="rounded-3xl bg-white p-7 text-[#1f2a24]">
            <h3 className="text-2xl font-semibold">상담 전 준비자료</h3>
            <ul className="mt-6 space-y-4 text-[#526257]">
              <li>✓ 주주명부</li>
              <li>✓ 정관 </li>
              <li>✓ 변경하려는 내용의 요약</li>
            </ul>

            <div className="mt-8 max-h-48 overflow-y-auto rounded-2xl bg-[#f7f8f5] p-5 text-sm leading-7 text-[#526257]">
              {privacyPolicy.split("\n").map((line, index) => (
                <p
                  key={index}
                  className={
                    line.startsWith("제")
                      ? "mt-4 font-bold text-[#102219]"
                      : ""
                  }
                >
                  {line || "\u00A0"}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d9ded5] bg-[#f7f8f5]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-[#66746b] lg:flex-row lg:items-center lg:justify-between">
          <p>
            <strong className="text-[#102219]">숲 법무사 사무소</strong> · 대표
            법무사 황배익, 김지안
          </p>
          <p>© SOOP Certified Judicial Scrivener Office. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}