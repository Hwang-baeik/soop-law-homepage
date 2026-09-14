import Link from "next/link";
import { AccountShell } from "../../../../components/account-shell";
import { CompanyDocumentsPanel } from "../../../../components/company-documents-panel";

const registrySections = [
  {
    title: "회사 기본사항",
    rows: [
      ["상호", "등록된 정보 없음"],
      ["법인등록번호", "등록된 정보 없음"],
      ["본점", "등록된 정보 없음"],
      ["공고방법", "등록된 정보 없음"],
      ["회사성립연월일", "등록된 정보 없음"],
    ],
  },
  {
    title: "목적",
    rows: [["목적사업", "관리자가 등기사항을 기준으로 업데이트합니다."]],
  },
  {
    title: "주식 및 자본",
    rows: [
      ["발행할 주식의 총수", "등록된 정보 없음"],
      ["1주의 금액", "등록된 정보 없음"],
      ["발행주식의 총수", "등록된 정보 없음"],
      ["주식의 종류", "등록된 정보 없음"],
      ["자본금의 액", "등록된 정보 없음"],
    ],
  },
  {
    title: "임원에 관한 사항",
    rows: [
      ["대표이사", "등록된 정보 없음"],
      ["사내이사", "등록된 정보 없음"],
      ["기타비상무이사", "등록된 정보 없음"],
      ["감사", "등록된 정보 없음"],
    ],
  },
  {
    title: "기타 등기사항",
    rows: [
      ["지점", "등록된 정보 없음"],
      ["존립기간 또는 해산사유", "등록된 정보 없음"],
      ["전환주식·상환주식 등", "등록된 정보 없음"],
      ["기타", "등록된 정보 없음"],
    ],
  },
];

const sampleShareholders = [
  ["주주명", "주식종류", "주식수", "지분율"],
  ["등록된 정보 없음", "-", "-", "-"],
];

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isOwner = id === "owner-company";
  const companyName = isOwner ? "소유 회사 예시" : "관리 회사 예시";
  const permission = isOwner ? "소유주" : "관리권한";

  const mailSubject = encodeURIComponent(`[회사정보 변경요청] ${companyName}`);
  const mailBody = encodeURIComponent(`회사명: ${companyName}\n요청자 권한: ${permission}\n\n변경이 필요한 항목:\n\n변경 요청 내용:\n`);

  return (
    <AccountShell title={companyName} description="등기사항과 회사 내부 관리정보를 한 화면에서 확인합니다.">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-300 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">COMPANY RECORD</p>
          <p className="mt-2 text-sm text-stone-500">나의 권한</p>
          <p className="mt-1 font-bold text-stone-950">{permission}</p>
        </div>
        <a
          href={`mailto:soop@sooplaw.com?subject=${mailSubject}&body=${mailBody}`}
          className="inline-flex rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-950"
        >
          정보 변경 요청
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-stone-800 bg-[#fffef9] shadow-sm">
        <div className="border-b-2 border-stone-800 px-5 py-4 text-center">
          <p className="text-xs tracking-[0.3em] text-stone-500">법 인 정 보</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-stone-950">회사 기본 현황</h2>
          <p className="mt-1 text-xs text-stone-500">등기사항증명서의 정보 배열을 참고한 관리 화면입니다.</p>
        </div>

        {registrySections.map((section) => (
          <section key={section.title} className="border-b border-stone-500 last:border-b-0">
            <div className="border-b border-stone-400 bg-stone-100 px-4 py-2 text-sm font-extrabold text-stone-900">
              {section.title}
            </div>
            <dl>
              {section.rows.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[9rem_1fr] border-b border-stone-300 last:border-b-0 sm:grid-cols-[12rem_1fr]">
                  <dt className="border-r border-stone-300 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700">{label}</dt>
                  <dd className="px-4 py-3 text-sm leading-6 text-stone-800">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-emerald-800">SHAREHOLDERS</p>
            <h2 className="mt-1 text-lg font-extrabold">주주 구성</h2>
          </div>
          <span className="text-xs text-stone-500">관리자 업데이트</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>{sampleShareholders[0].map((cell) => <th key={cell} className="border-b border-stone-200 px-4 py-3 text-left font-semibold">{cell}</th>)}</tr>
            </thead>
            <tbody>
              <tr>{sampleShareholders[1].map((cell, index) => <td key={`${cell}-${index}`} className="border-b border-stone-100 px-4 py-4 text-stone-700">{cell}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      <CompanyDocumentsPanel companyId={id} />

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        회사 정보와 문서는 회원이 직접 수정하지 않고 숲 법무사 사무소 관리자가 갱신합니다. 실제 내용과 다른 경우 ‘정보 변경 요청’으로 알려주시면 검토 후 반영합니다.
      </div>

      <div className="mt-6"><Link href="/mypage" className="text-sm font-bold text-emerald-900">← 내 회사 목록으로</Link></div>
    </AccountShell>
  );
}
