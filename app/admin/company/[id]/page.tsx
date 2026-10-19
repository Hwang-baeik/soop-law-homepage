import { AdminCompanyDetailClient } from "../../../../components/admin-company-detail-client";

export default async function AdminCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminCompanyDetailClient companyId={id} />;
}
