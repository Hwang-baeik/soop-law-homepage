import Link from "next/link";
import { AccountShell } from "../../../../components/account-shell";

const sections = [
  ["기본정보", ["상호", "법인등록번호", "본점 소재지", "설립일"]],
  ["임원정보", ["대표이사", "사내이사", "감사", "임기"]],
  ["자본·주식", ["자본금", "발행주식총수", "발행예정주식총수", "주식 종류"]],
  ["회사 문서", ["정관", "주주명부", "등기사항 요약", "기타 보관서류"]],
];

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isOwner = id === "owner-company";
  const companyName = isOwner ? "소유 회사 예시" : "관리 회사 예시";
  const permission = isOwner ? "소유주" : "관리권한";

  const mailSubject = encodeURIComponent(`[회사정보 변경요청] ${companyName}`);
  const mailBody = encodeURIComponent(`회사명: ${companyName}\n요청자 권한: ${permission}\n\n변경이 필요한 항목:\n\n변경 요청 내용:\n`);

  return (
    <AccountShell title={companyName} description="관리자가 등록·갱신한 회사 정보를 확인하는 화면입니다.">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-5">
        <div>
          <p className="text-sm text-stone-500">나의 권한</p>
          <p className="mt-1 font-bold text-stone-950">{permission}</p>
        </div>
        <a
          href={`mailto:soop@sooplaw.com?subject=${mailSubject}&body=${mailBody}`}
          className="inline-flex rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-950"
        >
          정보 변경 요청
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(([title, items]) => (
          <section key={title as string} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-stone-950">{title}</h2>
              <span className="text-xs font-medium text-stone-400">관리자 업데이트</span>
            </div>
            <dl className="mt-5 divide-y divide-stone-100">
              {(items as string[]).map((item) => (
                <div key={item} className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-stone-500">{item}</dt>
                  <dd className="font-medium text-stone-700">등록된 정보 없음</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        이 페이지의 정보는 회원이 직접 수정하지 않고 숲 법무사 사무소 관리자가 갱신하는 구조입니다. 실제 내용과 다른 경우 ‘정보 변경 요청’으로 알려주시면 관리자가 검토 후 반영합니다.
      </div>

      <div className="mt-6"><Link href="/mypage" className="text-sm font-bold text-emerald-900">← 내 회사 목록으로</Link></div>
    </AccountShell>
  );
}
