import Link from "next/link";
import { AccountShell } from "../../../../../components/account-shell";
import { CompanyDocumentUploader } from "../../../../../components/company-document-uploader";

export default async function AdminCompanyDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AccountShell title="회사 문서 관리" description="정관·주주명부 등 회사별 내부 문서를 권한이 있는 관리자·직원이 업로드합니다.">
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        등기부등본 PDF는 회사 상세 화면에서 별도로 관리합니다. 정관·주주명부·기타 문서는 이 화면에서 등록하며, 실제 업로드 가능 여부는 회사별 권한을 다시 확인합니다.
      </div>
      <CompanyDocumentUploader companyId={id} />
      <div className="mt-6">
        <Link href={`/admin/company/${id}`} className="text-sm font-bold text-emerald-900">← 회사 관리화면으로 돌아가기</Link>
      </div>
    </AccountShell>
  );
}
