import Link from "next/link";
import { AccountShell } from "../../../../../components/account-shell";
import { CompanyDocumentUploader } from "../../../../../components/company-document-uploader";

export default async function AdminCompanyDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AccountShell title="회사 문서 관리" description="정관·주주명부 등 회사별 문서를 업로드합니다. 관리자 계정만 사용할 수 있도록 권한이 적용됩니다.">
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        업로드된 문서는 비공개 Storage에 저장되고, 승인된 회사 구성원만 내려받을 수 있습니다. 파일 경로도 회사별로 분리됩니다.
      </div>
      <CompanyDocumentUploader companyId={id} />
      <div className="mt-6">
        <Link href={`/mypage/company/${id}`} className="text-sm font-bold text-emerald-900">← 회사 상세로 돌아가기</Link>
      </div>
    </AccountShell>
  );
}
