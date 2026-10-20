import Link from "next/link";
import { AccountShell } from "../../../../../components/account-shell";
import { CompanyMaterialsPanel } from "../../../../../components/company-materials-panel";

export default async function AdminCompanyDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AccountShell title="사무소 자료 보관현황" description="정관·주주명부 보관 여부를 확인·수정하고 자료 요청을 접수합니다.">
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        정관·주주명부·등기부등본의 홈페이지 업로드는 중단되었습니다. 파일은 사무소에서 별도로 보관하고, 홈페이지에는 보관 여부만 기록합니다.
      </div>
      <CompanyMaterialsPanel key={id} companyId={id} />
      <div className="mt-6">
        <Link href={`/admin/company/${id}`} className="text-sm font-bold text-emerald-900">← 회사 관리화면으로 돌아가기</Link>
      </div>
    </AccountShell>
  );
}
