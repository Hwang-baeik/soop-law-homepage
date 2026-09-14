import Link from "next/link";
import { AccountShell } from "../../../../../components/account-shell";
import { CompanyDocumentUploader } from "../../../../../components/company-document-uploader";

export default async function AdminCompanyDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AccountShell title="회사 문서 관리" description="정관·주주명부 등 회사별 내부 문서를 관리자 권한으로 업로드합니다.">
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        등기부등본 PDF는 이 화면이 아니라 각 회사 상세 화면에서 해당 회사의 소유주 또는 관리권한 회원이 직접 등록합니다. 정관·주주명부·기타 문서는 이 관리자 화면에서 관리합니다.
      </div>
      <CompanyDocumentUploader companyId={id} />
      <div className="mt-6">
        <Link href={`/mypage/company/${id}`} className="text-sm font-bold text-emerald-900">← 회사 상세로 돌아가기</Link>
      </div>
    </AccountShell>
  );
}
