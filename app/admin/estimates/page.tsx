"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../../components/account-shell";
import { getSession, rest, storageRequest } from "../../../lib/supabase-browser";

type WorkType = "법인" | "부동산" | "법원";
type EstimateStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

type Company = {
  id: string;
  name: string;
  corporate_registration_number: string;
};

type EstimateJob = {
  id: string;
  admin_user_id: string;
  company_id: string | null;
  work_type: WorkType;
  title: string;
  client_name: string;
  input_data: Record<string, string>;
  status: EstimateStatus;
  xlsx_path: string | null;
  pdf_path: string | null;
  error_message: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
};

type ExtraField = { key: string; value: string };

const statusLabel: Record<EstimateStatus, string> = {
  pending: "생성 대기",
  processing: "생성 중",
  completed: "완료",
  failed: "실패",
  cancelled: "취소",
};

const statusClass: Record<EstimateStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  processing: "bg-blue-100 text-blue-900",
  completed: "bg-emerald-100 text-emerald-900",
  failed: "bg-red-100 text-red-900",
  cancelled: "bg-stone-200 text-stone-600",
};

function tokenName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) return trimmed;
  return `{{${trimmed.replace(/^\{+|\}+$/g, "").trim()}}}`;
}

export default function EstimateAdminPage() {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "staff" | null>(null);
  const [adminUserId, setAdminUserId] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<EstimateJob[]>([]);
  const [workType, setWorkType] = useState<WorkType>("법인");
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [note1, setNote1] = useState("");
  const [note2, setNote2] = useState("");
  const [extraFields, setExtraFields] = useState<ExtraField[]>([{ key: "", value: "" }]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) || null,
    [companies, companyId],
  );

  const load = useCallback(async () => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    try {
      const profileResponse = await rest(
        `profiles?id=eq.${session.user.id}&select=role,status`,
        session.access_token,
      );
      if (!profileResponse.ok) throw new Error("계정 권한을 확인하지 못했습니다.");
      const profile = (await profileResponse.json())?.[0];

      if (!profile || profile.status !== "approved" || !["admin", "staff"].includes(profile.role)) {
        router.replace("/mypage");
        return;
      }

      let ownerAdminId = session.user.id;
      if (profile.role === "staff") {
        const permissionResponse = await rest(
          `office_staff_permissions?user_id=eq.${session.user.id}&select=admin_user_id,is_active`,
          session.access_token,
        );
        if (!permissionResponse.ok) throw new Error("직원 권한을 확인하지 못했습니다.");
        const permission = (await permissionResponse.json())?.[0];
        if (!permission?.is_active || !permission.admin_user_id) {
          router.replace("/mypage");
          return;
        }
        ownerAdminId = permission.admin_user_id;
      }

      setRole(profile.role);
      setAdminUserId(ownerAdminId);

      const [companyResponse, jobsResponse] = await Promise.all([
        rest("companies?select=id,name,corporate_registration_number&order=name.asc", session.access_token),
        rest(
          `estimate_jobs?admin_user_id=eq.${ownerAdminId}&select=id,admin_user_id,company_id,work_type,title,client_name,input_data,status,xlsx_path,pdf_path,error_message,created_by,created_at,completed_at&order=created_at.desc&limit=100`,
          session.access_token,
        ),
      ]);

      if (!companyResponse.ok || !jobsResponse.ok) throw new Error("견적서 관리정보를 불러오지 못했습니다.");
      setCompanies(await companyResponse.json());
      setJobs(await jobsResponse.json());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "견적서 관리정보 조회 중 오류가 발생했습니다.");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (workType === "법인" && selectedCompany) setClientName(selectedCompany.name);
  }, [selectedCompany, workType]);

  function addExtraField() {
    setExtraFields((current) => [...current, { key: "", value: "" }]);
  }

  function updateExtraField(index: number, field: keyof ExtraField, value: string) {
    setExtraFields((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  }

  function removeExtraField(index: number) {
    setExtraFields((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [{ key: "", value: "" }];
    });
  }

  async function createEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session || !adminUserId) {
      setMessage("로그인 또는 관리자 연결정보를 다시 확인해 주세요.");
      return;
    }

    const normalizedTitle = title.trim();
    const normalizedClient = clientName.trim();
    if (!normalizedTitle) {
      setMessage(workType === "법원" ? "업무목적을 입력해 주세요." : "등기목적을 입력해 주세요.");
      return;
    }
    if (!normalizedClient) {
      setMessage(workType === "법인" ? "상호를 입력하거나 회사를 선택해 주세요." : "의뢰인을 입력해 주세요.");
      return;
    }

    const inputData: Record<string, string> = {
      [workType === "법원" ? "{{업무목적}}" : "{{등기목적}}"]: normalizedTitle,
      [workType === "법인" ? "{{상호}}" : "{{의뢰인}}"]: normalizedClient,
      "{{비고1}}": note1.trim(),
      "{{비고2}}": note2.trim(),
    };

    for (const item of extraFields) {
      const key = tokenName(item.key);
      if (key) inputData[key] = item.value.trim();
    }

    try {
      setWorking("create");
      setMessage("");
      const response = await rest("estimate_jobs", session.access_token, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          admin_user_id: adminUserId,
          company_id: companyId || null,
          work_type: workType,
          title: normalizedTitle,
          client_name: normalizedClient,
          input_data: inputData,
          status: "pending",
          created_by: session.user.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.details || "견적 생성 요청을 등록하지 못했습니다.");
      }

      setTitle("");
      setNote1("");
      setNote2("");
      setExtraFields([{ key: "", value: "" }]);
      setMessage("견적서 생성 요청을 등록했습니다. 사무실 생성 프로그램이 처리하면 Excel/PDF 다운로드가 활성화됩니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "견적 생성 요청 중 오류가 발생했습니다.");
    } finally {
      setWorking("");
    }
  }

  async function setStatus(job: EstimateJob, status: "cancelled" | "pending") {
    const session = getSession();
    if (!session) return;

    try {
      setWorking(job.id);
      setMessage("");
      const response = await rest(`estimate_jobs?id=eq.${job.id}`, session.access_token, {
        method: "PATCH",
        body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.details || "견적 상태를 변경하지 못했습니다.");
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "견적 상태 변경 중 오류가 발생했습니다.");
    } finally {
      setWorking("");
    }
  }

  async function downloadResult(job: EstimateJob, kind: "xlsx" | "pdf") {
    const session = getSession();
    if (!session) return;
    const path = kind === "xlsx" ? job.xlsx_path : job.pdf_path;
    if (!path) return;

    try {
      setWorking(`${job.id}-${kind}`);
      const response = await storageRequest(
        `object/estimate-files/${path.split("/").map(encodeURIComponent).join("/")}`,
        session.access_token,
      );
      if (!response.ok) throw new Error("파일을 다운로드하지 못했습니다.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = path.split("/").pop() || `견적서.${kind}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파일 다운로드 중 오류가 발생했습니다.");
    } finally {
      setWorking("");
    }
  }

  return (
    <AccountShell
      title="견적서 자동작성"
      description="관리자와 소속 직원만 사용하는 내부 업무도구입니다. 입력값은 기존 Excel 템플릿의 {{치환키}} 형식으로 생성 프로그램에 전달됩니다."
    >
      {message && (
        <p className="mb-6 rounded-xl bg-stone-100 p-4 text-sm leading-6 text-stone-700">{message}</p>
      )}

      <section className="rounded-2xl border border-stone-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">새 견적서</h2>
            <p className="mt-1 text-sm text-stone-500">
              {role === "staff" ? "직원 권한으로 연결된 관리자 사무소의 견적을 작성합니다." : "관리자 사무소의 견적을 작성합니다."}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
            내부 전용
          </span>
        </div>

        <form onSubmit={createEstimate} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            업무종류
            <select
              value={workType}
              onChange={(event) => setWorkType(event.target.value as WorkType)}
              className={fieldClassName}
            >
              <option value="법인">법인등기</option>
              <option value="부동산">부동산등기</option>
              <option value="법원">법원업무</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            관리회사 연결
            <select
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className={fieldClassName}
            >
              <option value="">연결하지 않음</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.corporate_registration_number})
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            {workType === "법원" ? "업무목적" : "등기목적"}
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={fieldClassName}
              placeholder={workType === "법원" ? "예: 지급명령" : "예: 임원변경"}
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            {workType === "법인" ? "상호" : "의뢰인"}
            <input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              className={fieldClassName}
              placeholder={workType === "법인" ? "주식회사 ○○" : "의뢰인명"}
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            비고1
            <input value={note1} onChange={(event) => setNote1(event.target.value)} className={fieldClassName} />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            비고2
            <input value={note2} onChange={(event) => setNote2(event.target.value)} className={fieldClassName} />
          </label>

          <div className="md:col-span-2 rounded-xl bg-stone-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold">추가 치환항목</h3>
                <p className="mt-1 text-xs text-stone-500">
                  기존 bill_soop.xlsm에서 사용하는 항목명을 입력하면 자동으로 {"{{항목명}}"} 형식으로 저장합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={addExtraField}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:border-emerald-800"
              >
                항목 추가
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {extraFields.map((item, index) => (
                <div key={index} className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto]">
                  <input
                    value={item.key}
                    onChange={(event) => updateExtraField(index, "key", event.target.value)}
                    className={fieldClassName}
                    placeholder="예: 등록면허세"
                  />
                  <input
                    value={item.value}
                    onChange={(event) => updateExtraField(index, "value", event.target.value)}
                    className={fieldClassName}
                    placeholder="값"
                  />
                  <button
                    type="button"
                    onClick={() => removeExtraField(index)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-600"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            disabled={working === "create"}
            className={`${primaryButtonClassName} md:col-span-2`}
          >
            {working === "create" ? "생성 요청 등록 중..." : "견적서 생성 요청"}
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">견적서 내역</h2>
            <p className="mt-1 text-sm text-stone-500">최근 100건을 표시합니다. 삭제하지 않고 처리상태를 기록합니다.</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-700"
          >
            새로고침
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {jobs.length === 0 ? (
            <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">등록된 견적서가 없습니다.</p>
          ) : (
            jobs.map((job) => (
              <article key={job.id} className="rounded-xl border border-stone-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-stone-500">{job.work_type}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[job.status]}`}>
                        {statusLabel[job.status]}
                      </span>
                    </div>
                    <h3 className="mt-2 font-extrabold text-stone-900">
                      {job.title} · {job.client_name}
                    </h3>
                    <p className="mt-1 text-xs text-stone-500">
                      {new Date(job.created_at).toLocaleString("ko-KR")}
                    </p>
                    {job.error_message && (
                      <p className="mt-2 text-sm font-semibold text-red-700">{job.error_message}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {job.status === "completed" && job.xlsx_path && (
                      <button
                        type="button"
                        onClick={() => void downloadResult(job, "xlsx")}
                        disabled={working === `${job.id}-xlsx`}
                        className="rounded-lg border border-emerald-800 px-3 py-2 text-xs font-bold text-emerald-900"
                      >
                        Excel 다운로드
                      </button>
                    )}
                    {job.status === "completed" && job.pdf_path && (
                      <button
                        type="button"
                        onClick={() => void downloadResult(job, "pdf")}
                        disabled={working === `${job.id}-pdf`}
                        className="rounded-lg bg-emerald-900 px-3 py-2 text-xs font-bold text-white"
                      >
                        PDF 다운로드
                      </button>
                    )}
                    {["pending", "failed"].includes(job.status) && (
                      <button
                        type="button"
                        onClick={() => void setStatus(job, "cancelled")}
                        disabled={working === job.id}
                        className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-600"
                      >
                        취소
                      </button>
                    )}
                    {["failed", "cancelled"].includes(job.status) && (
                      <button
                        type="button"
                        onClick={() => void setStatus(job, "pending")}
                        disabled={working === job.id}
                        className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700"
                      >
                        다시 요청
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </AccountShell>
  );
}
