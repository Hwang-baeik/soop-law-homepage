import Link from "next/link";
import { AccountShell } from "../../../../components/account-shell";
import { AuthenticatedArea } from "../../../../components/authenticated-area";
import { CompanyDocumentsPanel } from "../../../../components/company-documents-panel";
import { CompanyRegistryViewer } from "../../../../components/company-registry-viewer";

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
    <AuthenticatedArea>
      <AccountShell title={companyName} description="등기부등본 원본과 회사 내부 관리자료를 확인합니다.">
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

        <CompanyRegistryViewer companyId={id} />

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
          등기사항은 별도 수기 입력 대신 업로드된 등기부등본 PDF 원본을 기준으로 확인합니다. 정관·주주명부 등 내부 문서는 아래 회사 문서함에서 별도로 관리합니다.
        </div>

        <div className="mt-6"><Link href="/mypage" className="text-sm font-bold text-emerald-900">← 내 회사 목록으로</Link></div>
      </AccountShell>
    </AuthenticatedArea>
  );
}
