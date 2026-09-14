"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileText, LockKeyhole } from "lucide-react";
import { getSession, rest } from "../lib/supabase-browser";

type CompanyDocument = {
  id: string;
  company_id: string;
  document_type: "articles" | "shareholder_register" | "registry" | "other";
  title: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_at: string;
};

const typeLabel: Record<CompanyDocument["document_type"], string> = {
  articles: "정관",
  shareholder_register: "주주명부",
  registry: "등기부등본",
  other: "기타 문서",
};

function formatSize(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CompanyDocumentsPanel({ companyId }: { companyId: string }) {
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const session = getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      try {
        const response = await rest(
          `company_documents?company_id=eq.${encodeURIComponent(companyId)}&document_type=neq.registry&select=*&order=uploaded_at.desc`,
          session.access_token,
        );
        if (!response.ok) throw new Error("문서 목록을 불러오지 못했습니다.");
        setDocuments(await response.json());
      } catch {
        setMessage("로그인 연결 후 이 회사에 등록된 문서가 표시됩니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  const download = async (document: CompanyDocument) => {
    const session = getSession();
    if (!session) {
      setMessage("로그인 후 문서를 내려받을 수 있습니다.");
      return;
    }
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    try {
      const response = await fetch(
        `${base}/storage/v1/object/authenticated/company-documents/${document.storage_path}`,
        { headers: { apikey: key || "", Authorization: `Bearer ${session.access_token}` } },
      );
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.file_name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("문서를 내려받지 못했습니다. 접근권한 또는 파일 상태를 확인해 주세요.");
    }
  };

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-emerald-800">
            <LockKeyhole className="h-4 w-4" /> COMPANY DOCUMENTS
          </div>
          <h2 className="mt-1 text-lg font-extrabold">회사 문서함</h2>
          <p className="mt-1 text-xs text-stone-500">정관·주주명부 등 회사별 비공개 보관 문서입니다.</p>
        </div>
        <Link href={`/admin/company/${companyId}/documents`} className="rounded-full border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50">
          관리자 업로드
        </Link>
      </div>

      {loading ? (
        <p className="px-5 py-6 text-sm text-stone-500">문서를 확인하고 있습니다.</p>
      ) : documents.length === 0 ? (
        <div className="px-5 py-7 text-sm text-stone-500">
          <p>등록된 회사 문서가 없습니다.</p>
          <p className="mt-1 text-xs">관리자가 정관·주주명부 등을 등록하면 이곳에서 내려받을 수 있습니다.</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {documents.map((document) => (
            <div key={document.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-xl bg-stone-100 p-2.5 text-stone-700"><FileText className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-800">{typeLabel[document.document_type]}</p>
                  <p className="truncate font-bold text-stone-900">{document.title}</p>
                  <p className="mt-1 text-xs text-stone-500">{document.file_name} · {formatSize(document.file_size)}</p>
                </div>
              </div>
              <button onClick={() => download(document)} className="inline-flex items-center gap-2 rounded-full bg-emerald-900 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-950">
                <Download className="h-4 w-4" /> 내려받기
              </button>
            </div>
          ))}
        </div>
      )}
      {message && <p className="border-t border-stone-100 px-5 py-3 text-xs text-amber-800">{message}</p>}
    </section>
  );
}
