"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { getSession, rest } from "../lib/supabase-browser";

const documentTypes = [
  ["articles", "정관"],
  ["shareholder_register", "주주명부"],
  ["other", "기타 문서"],
] as const;

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function CompanyDocumentUploader({ companyId }: { companyId: string }) {
  const [documentType, setDocumentType] = useState<(typeof documentTypes)[number][0]>("articles");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    const session = getSession();
    if (!session) return setMessage("관리자 로그인 후 업로드할 수 있습니다.");
    if (!file || !title.trim()) return setMessage("문서명과 파일을 모두 입력해 주세요.");

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const storagePath = `${companyId}/${Date.now()}-${safeFileName(file.name)}`;

    try {
      setUploading(true);
      setMessage("");
      const uploadResponse = await fetch(
        `${base}/storage/v1/object/company-documents/${storagePath}`,
        {
          method: "POST",
          headers: {
            apikey: key || "",
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": file.type || "application/octet-stream",
            "x-upsert": "false",
          },
          body: file,
        },
      );
      if (!uploadResponse.ok) throw new Error("파일 업로드에 실패했습니다.");

      const metadataResponse = await rest("company_documents", session.access_token, {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          company_id: companyId,
          document_type: documentType,
          title: title.trim(),
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size,
          uploaded_by: session.user.id,
        }),
      });
      if (!metadataResponse.ok) throw new Error("문서정보 저장에 실패했습니다.");

      setTitle("");
      setFile(null);
      setMessage("문서를 등록했습니다. 회사 문서함에서 내려받을 수 있습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="grid gap-2">
        <label className="text-sm font-bold text-stone-700">문서 종류</label>
        <select value={documentType} onChange={(e) => setDocumentType(e.target.value as typeof documentType)} className="h-11 rounded-xl border border-stone-300 px-3">
          {documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-bold text-stone-700">표시 문서명</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 2026.09.14. 현재 정관" className="h-11 rounded-xl border border-stone-300 px-3" />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-bold text-stone-700">파일</label>
        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,.hwpx,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded-xl border border-dashed border-stone-300 p-4 text-sm" />
        <p className="text-xs leading-5 text-stone-500">정관·주주명부는 PDF를 권장합니다. 등기부등본 PDF는 회사 상세 화면에서 소유주 또는 관리권한 회원이 직접 등록합니다.</p>
      </div>
      <button type="button" onClick={upload} disabled={uploading} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-900 px-5 text-sm font-bold text-white disabled:bg-stone-300">
        <Upload className="h-4 w-4" /> {uploading ? "업로드 중..." : "문서 업로드"}
      </button>
      {message && <p className="text-sm text-stone-700">{message}</p>}
    </div>
  );
}
