"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { getSession, rest, storageRequest } from "../lib/supabase-browser";

const documentTypes = [
  ["articles", "정관"],
  ["shareholder_register", "주주명부"],
  ["other", "기타 문서"],
] as const;

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const allowedExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "hwp", "hwpx", "jpg", "jpeg", "png"];

function safeFileName(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, "_"); }
function encodeStoragePath(path: string) { return path.split("/").map(encodeURIComponent).join("/"); }
function mimeForFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    hwp: "application/x-hwp", hwpx: "application/vnd.hancom.hwpx", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  };
  return map[ext] || file.type || "application/octet-stream";
}

export function CompanyDocumentUploader({ companyId }: { companyId: string }) {
  const [documentType, setDocumentType] = useState<(typeof documentTypes)[number][0]>("articles");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const session = getSession();
      if (!session) { setCheckingPermission(false); return; }
      try {
        const profileResponse = await rest(`profiles?id=eq.${session.user.id}&select=role,status`, session.access_token);
        const profile = (await profileResponse.json())?.[0];
        if (!profile || profile.status !== "approved") return;
        if (profile.role === "admin") { setAllowed(true); return; }
        if (profile.role !== "staff") return;
        const [permissionResponse, assignmentResponse] = await Promise.all([
          rest(`office_staff_permissions?user_id=eq.${session.user.id}&select=can_manage_documents,is_active`, session.access_token),
          rest(`office_staff_company_assignments?user_id=eq.${session.user.id}&company_id=eq.${encodeURIComponent(companyId)}&select=can_view,can_manage_documents`, session.access_token),
        ]);
        const permission = (await permissionResponse.json())?.[0];
        const assignment = (await assignmentResponse.json())?.[0];
        setAllowed(Boolean(permission?.is_active && permission?.can_manage_documents && assignment?.can_view && assignment?.can_manage_documents));
      } catch {
        setAllowed(false);
      } finally { setCheckingPermission(false); }
    };
    void check();
  }, [companyId]);

  const upload = async () => {
    if (!allowed) return setMessage("이 계정에는 이 회사의 문서 업로드 권한이 없습니다.");
    const session = getSession();
    if (!session) return setMessage("로그인 후 업로드할 수 있습니다.");
    if (!file || !title.trim()) return setMessage("문서명과 파일을 모두 입력해 주세요.");
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(ext)) return setMessage("PDF, Word, Excel, HWP/HWPX, JPG, PNG 파일만 업로드할 수 있습니다.");
    if (file.size > MAX_FILE_SIZE) return setMessage("파일 크기는 50MB 이하만 업로드할 수 있습니다.");

    const rawPath = `${companyId}/documents/${Date.now()}-${safeFileName(file.name)}`;
    try {
      setUploading(true); setMessage("");
      const uploadResponse = await storageRequest(`object/company-documents/${encodeStoragePath(rawPath)}`, session.access_token, {
        method: "POST",
        headers: { "Content-Type": mimeForFile(file), "x-upsert": "false" },
        body: file,
      });
      if (!uploadResponse.ok) {
        const detail = await uploadResponse.json().catch(() => ({}));
        throw new Error(detail.message || "파일 업로드에 실패했습니다.");
      }

      const metadataResponse = await rest("company_documents", session.access_token, {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          company_id: companyId,
          document_type: documentType,
          title: title.trim(),
          storage_path: rawPath,
          file_name: file.name,
          mime_type: mimeForFile(file),
          file_size: file.size,
          uploaded_by: session.user.id,
        }),
      });
      if (!metadataResponse.ok) {
        await storageRequest(`object/company-documents/${encodeStoragePath(rawPath)}`, session.access_token, { method: "DELETE" }).catch(() => null);
        const detail = await metadataResponse.json().catch(() => ({}));
        throw new Error(detail.message || "문서정보 저장에 실패했습니다.");
      }

      setTitle(""); setFile(null);
      setMessage("문서를 등록했습니다. 회사 문서함에서 내려받을 수 있습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.");
    } finally { setUploading(false); }
  };

  if (checkingPermission) return <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500">문서 관리권한을 확인하고 있습니다.</div>;
  if (!allowed) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">이 계정에는 이 회사의 문서 업로드 권한이 없습니다.</div>;

  return (
    <div className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="grid gap-2"><label className="text-sm font-bold text-stone-700">문서 종류</label><select value={documentType} onChange={(e) => setDocumentType(e.target.value as typeof documentType)} className="h-11 rounded-xl border border-stone-300 px-3">{documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="grid gap-2"><label className="text-sm font-bold text-stone-700">표시 문서명</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 2026.09.14. 현재 정관" className="h-11 rounded-xl border border-stone-300 px-3" /></div>
      <div className="grid gap-2">
        <label className="text-sm font-bold text-stone-700">파일</label>
        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,.hwpx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded-xl border border-dashed border-stone-300 p-4 text-sm" />
        <p className="text-xs leading-5 text-stone-500">PDF·Word·Excel·HWP/HWPX·이미지, 최대 50MB. 정관·주주명부는 PDF를 권장합니다.</p>
      </div>
      <button type="button" onClick={() => void upload()} disabled={uploading} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-900 px-5 text-sm font-bold text-white disabled:bg-stone-300"><Upload className="h-4 w-4" /> {uploading ? "업로드 중..." : "문서 업로드"}</button>
      {message && <p className="text-sm text-stone-700">{message}</p>}
    </div>
  );
}
