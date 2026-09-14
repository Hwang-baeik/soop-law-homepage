"use client";

import { useEffect, useState } from "react";
import { FileUp, RefreshCw } from "lucide-react";
import { getSession, rest } from "../lib/supabase-browser";

type RegistryDocument = {
  id: string;
  company_id: string;
  document_type: "registry";
  title: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  uploaded_at: string;
};

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function CompanyRegistryViewer({
  companyId,
  canViewDocuments = true,
  canUploadRegistry = false,
}: {
  companyId: string;
  canViewDocuments?: boolean;
  canUploadRegistry?: boolean;
}) {
  const [document, setDocument] = useState<RegistryDocument | null>(null);
  const [viewerUrl, setViewerUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadLatest = async () => {
    if (!canViewDocuments) {
      setLoading(false);
      setDocument(null);
      setViewerUrl("");
      setMessage("이 계정에는 회사 문서 조회 권한이 없습니다.");
      return;
    }

    const session = getSession();
    if (!session) {
      setLoading(false);
      setMessage("로그인 후 등기부등본을 확인할 수 있습니다.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const response = await rest(
        `company_documents?company_id=eq.${encodeURIComponent(companyId)}&document_type=eq.registry&select=*&order=uploaded_at.desc&limit=1`,
        session.access_token,
      );
      if (!response.ok) throw new Error("등기부등본 정보를 불러오지 못했습니다.");
      const rows: RegistryDocument[] = await response.json();
      const latest = rows[0] || null;
      setDocument(latest);

      if (!latest) {
        setViewerUrl("");
        return;
      }

      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const fileResponse = await fetch(
        `${base}/storage/v1/object/authenticated/company-documents/${latest.storage_path}`,
        { headers: { apikey: key || "", Authorization: `Bearer ${session.access_token}` } },
      );
      if (!fileResponse.ok) throw new Error("등기부등본 파일을 열지 못했습니다.");
      const blob = await fileResponse.blob();
      const url = URL.createObjectURL(blob);
      setViewerUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "등기부등본을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLatest();
    return () => {
      if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    };
    // viewerUrl은 cleanup에서만 사용합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, canViewDocuments]);

  const upload = async () => {
    if (!canUploadRegistry) return setMessage("이 계정에는 등기부등본 업로드 권한이 없습니다.");
    const session = getSession();
    if (!session) return setMessage("로그인 후 업로드할 수 있습니다.");
    if (!file) return setMessage("PDF 등기부등본 파일을 선택해 주세요.");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return setMessage("등기부등본은 PDF 파일만 업로드할 수 있습니다.");
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const storagePath = `${companyId}/registry/${Date.now()}-${safeFileName(file.name)}`;

    try {
      setUploading(true);
      setMessage("");
      const uploadResponse = await fetch(`${base}/storage/v1/object/company-documents/${storagePath}`, {
        method: "POST",
        headers: {
          apikey: key || "",
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/pdf",
          "x-upsert": "false",
        },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("등기부등본 업로드에 실패했습니다.");

      const metadataResponse = await rest("company_documents", session.access_token, {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          company_id: companyId,
          document_type: "registry",
          title: "법인 등기사항증명서",
          storage_path: storagePath,
          file_name: file.name,
          mime_type: "application/pdf",
          file_size: file.size,
          uploaded_by: session.user.id,
        }),
      });
      if (!metadataResponse.ok) throw new Error("등기부등본 정보 저장에 실패했습니다.");

      setFile(null);
      setMessage("등기부등본을 등록했습니다. 가장 최근 업로드본이 표시됩니다.");
      await loadLatest();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 px-5 py-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-emerald-800">CORPORATE REGISTRY</p>
          <h2 className="mt-1 text-xl font-extrabold text-stone-950">법인 등기사항증명서</h2>
          <p className="mt-1 text-sm text-stone-500">PDF 원본을 화면에서 1페이지부터 마지막 페이지까지 직접 넘겨 확인합니다.</p>
        </div>
        {canViewDocuments ? (
          <button onClick={() => void loadLatest()} type="button" className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50">
            <RefreshCw className="h-4 w-4" /> 새로고침
          </button>
        ) : null}
      </div>

      {canUploadRegistry ? (
        <div className="border-b border-stone-200 bg-stone-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="min-w-0 flex-1 rounded-xl border border-dashed border-stone-300 bg-white p-3 text-sm"
            />
            <button
              type="button"
              onClick={() => void upload()}
              disabled={uploading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-900 px-5 text-sm font-bold text-white disabled:bg-stone-300"
            >
              <FileUp className="h-4 w-4" /> {uploading ? "업로드 중..." : "등기부등본 업로드"}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-stone-500">관리자가 이 계정에 등기부등본 업로드 권한을 부여한 경우에만 표시됩니다.</p>
        </div>
      ) : null}

      {loading ? (
        <div className="p-8 text-center text-sm text-stone-500">등기부등본을 불러오고 있습니다.</div>
      ) : viewerUrl ? (
        <div className="bg-stone-200 p-2 sm:p-4">
          <iframe
            title={document?.title || "법인 등기사항증명서"}
            src={`${viewerUrl}#page=1&view=FitH`}
            className="h-[72vh] min-h-[640px] w-full rounded-lg bg-white shadow-inner"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
            <span>{document?.file_name}</span>
            <span>PDF 뷰어의 페이지 이동 버튼 또는 페이지 번호 입력으로 마지막 페이지까지 확인할 수 있습니다.</span>
          </div>
        </div>
      ) : canViewDocuments ? (
        <div className="p-10 text-center text-sm text-stone-500">등록된 등기부등본이 없습니다.</div>
      ) : (
        <div className="p-10 text-center text-sm text-stone-500">회사 문서 조회 권한이 없습니다.</div>
      )}

      {message && <p className="border-t border-stone-100 px-5 py-3 text-sm text-amber-800">{message}</p>}
    </section>
  );
}
