"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../components/account-shell";
import { PASSWORD_PATTERN } from "../../lib/member-types";
import { getSession, rest, signUp } from "../../lib/supabase-browser";

type MemberRow = {
  user_id: string;
  email: string;
  display_name: string;
  phone: string;
  profile_role: "admin" | "staff" | "client";
  profile_status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string;
  company_id: string | null;
  company_name: string | null;
  member_role: "owner" | "manager" | "member" | null;
  can_view_company: boolean | null;
  can_view_documents: boolean | null;
  can_upload_registry: boolean | null;
  is_active: boolean | null;
};

type Company = {
  id: string;
  name: string;
  corporate_registration_number: string;
};

function roleLabel(role: MemberRow["member_role"]) {
  if (role === "owner") return "소유주";
  if (role === "manager") return "관리권한";
  if (role === "member") return "하위 멤버";
  return "회사 미지정";
}

function statusLabel(status: MemberRow["profile_status"]) {
  if (status === "approved") return "승인";
  if (status === "rejected") return "거절";
  if (status === "suspended") return "정지";
  return "승인 대기";
}

export default function AdminPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    try {
      setLoading(true);
      const profileResponse = await rest(
        `profiles?id=eq.${encodeURIComponent(session.user.id)}&select=role,status`,
        session.access_token,
      );
      if (!profileResponse.ok) throw new Error("관리자 정보를 확인하지 못했습니다.");
      const profile = (await profileResponse.json())?.[0];
      if (!profile || profile.role !== "admin" || profile.status !== "approved") {
        router.replace("/mypage");
        return;
      }

      const [memberResponse, companyResponse] = await Promise.all([
        rest("rpc/admin_list_members", session.access_token, { method: "POST", body: JSON.stringify({}) }),
        rest("companies?select=id,name,corporate_registration_number&order=name.asc", session.access_token),
      ]);
      if (!memberResponse.ok) throw new Error("회원 목록을 불러오지 못했습니다.");
      if (!companyResponse.ok) throw new Error("회사 목록을 불러오지 못했습니다.");

      setMembers(await memberResponse.json());
      setCompanies(await companyResponse.json());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "관리자 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function callRpc(name: string, payload: Record<string, unknown>) {
    const session = getSession();
    if (!session) throw new Error("로그인이 필요합니다.");
    const response = await rest(`rpc/${name}`, session.access_token, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      let detail = "관리자 작업을 처리하지 못했습니다.";
      try {
        const error = await response.json();
        detail = error.message || error.details || detail;
      } catch {}
      throw new Error(detail);
    }
  }

  async function setStatus(userId: string, status: "approved" | "rejected" | "suspended") {
    try {
      setWorking(`status-${userId}`);
      setMessage("");
      await callRpc("admin_set_profile_status", { target_user: userId, new_status: status });
      setMessage(status === "approved" ? "회원 승인이 완료되었습니다." : status === "rejected" ? "가입 신청을 거절했습니다." : "회원 이용을 정지했습니다.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "회원 상태 변경 중 오류가 발생했습니다.");
    } finally {
      setWorking("");
    }
  }

  function updateAccessRow(index: number, patch: Partial<MemberRow>) {
    setMembers((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  async function saveAccess(row: MemberRow) {
    if (!row.company_id || !row.member_role) return;
    try {
      setWorking(`access-${row.user_id}-${row.company_id}`);
      setMessage("");
      await callRpc("admin_set_company_access", {
        target_user: row.user_id,
        target_company: row.company_id,
        target_member_role: row.member_role,
        allow_view_company: Boolean(row.can_view_company),
        allow_view_documents: Boolean(row.can_view_documents),
        allow_upload_registry: Boolean(row.can_upload_registry),
      });
      setMessage("회사별 권한을 저장했습니다.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "권한 저장 중 오류가 발생했습니다.");
    } finally {
      setWorking("");
    }
  }

  async function revokeAccess(row: MemberRow) {
    if (!row.company_id) return;
    try {
      setWorking(`revoke-${row.user_id}-${row.company_id}`);
      setMessage("");
      await callRpc("admin_revoke_company_access", {
        target_user: row.user_id,
        target_company: row.company_id,
      });
      setMessage("회사 접근권한을 해제했습니다. 회사 데이터와 문서는 삭제되지 않습니다.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "접근권한 해제 중 오류가 발생했습니다.");
    } finally {
      setWorking("");
    }
  }

  async function createSubmember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const displayName = String(data.get("displayName") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const passwordConfirm = String(data.get("passwordConfirm") ?? "");
    const companyId = String(data.get("companyId") ?? "");
    const memberRole = String(data.get("memberRole") ?? "member");
    const canViewCompany = data.get("canViewCompany") === "on";
    const canViewDocuments = data.get("canViewDocuments") === "on";
    const canUploadRegistry = data.get("canUploadRegistry") === "on";

    if (!PASSWORD_PATTERN.test(password)) {
      setMessage("초기 비밀번호는 영문, 숫자, 특수문자를 포함하여 8자리 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setMessage("초기 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (!companyId) {
      setMessage("하위 멤버가 소속될 회사를 선택해 주세요.");
      return;
    }

    try {
      setWorking("create-submember");
      setMessage("");
      const result = await signUp(email, password, { display_name: displayName, phone });
      const userId = result.user?.id;
      if (!userId) throw new Error("새 회원 계정 ID를 확인하지 못했습니다.");
      if (Array.isArray(result.user?.identities) && result.user?.identities?.length === 0) {
        throw new Error("이미 가입된 이메일일 수 있습니다. 기존 회원 목록에서 권한을 부여해 주세요.");
      }

      await callRpc("admin_provision_submember", {
        target_user: userId,
        target_company: companyId,
        target_member_role: memberRole,
        allow_view_company: canViewCompany,
        allow_view_documents: canViewDocuments,
        allow_upload_registry: canUploadRegistry,
      });

      formElement.reset();
      setMessage("하위 멤버 계정을 생성했습니다. 사용자는 이메일 확인 후 초기 비밀번호로 로그인하고 새 비밀번호로 변경해야 합니다.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "하위 멤버 생성 중 오류가 발생했습니다.");
    } finally {
      setWorking("");
    }
  }

  const pendingUsers = members.filter((row, index, all) => row.profile_status === "pending" && all.findIndex((item) => item.user_id === row.user_id) === index);

  return (
    <AccountShell title="관리자 · 회원관리" description="가입 승인, 하위 멤버 생성, 회사별 권한을 관리합니다.">
      {message && <p className="mb-6 rounded-xl bg-stone-100 p-4 text-sm leading-6 text-stone-700">{message}</p>}

      <section className="mb-8 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 bg-stone-50 p-5">
          <h2 className="text-lg font-extrabold text-stone-950">가입 승인 대기</h2>
          <p className="mt-1 text-sm text-stone-500">외부에서 가입 신청한 회원을 승인하거나 거절합니다.</p>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-stone-500">회원 정보를 불러오는 중입니다.</p>
        ) : pendingUsers.length === 0 ? (
          <p className="p-5 text-sm text-stone-500">현재 승인 대기 회원이 없습니다.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {pendingUsers.map((member) => (
              <div key={member.user_id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-bold text-stone-950">{member.display_name || "이름 미입력"}</p>
                  <p className="mt-1 text-sm text-stone-600">{member.email} · {member.phone || "연락처 없음"}</p>
                  <p className="mt-1 text-sm text-stone-500">{member.company_name || "회사 미지정"} · {roleLabel(member.member_role)}</p>
                </div>
                <div className="flex gap-2">
                  <button disabled={working === `status-${member.user_id}`} onClick={() => void setStatus(member.user_id, "approved")} className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">승인</button>
                  <button disabled={working === `status-${member.user_id}`} onClick={() => void setStatus(member.user_id, "rejected")} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold disabled:opacity-40">거절</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-extrabold text-stone-950">하위 멤버 신규 생성</h2>
        <p className="mt-1 text-sm leading-6 text-stone-500">회사별 최소 권한만 부여합니다. 삭제 권한은 하위 멤버에게 부여되지 않습니다.</p>
        <form onSubmit={createSubmember} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">이름<input name="displayName" required className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold">연락처<input name="phone" required type="tel" className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold md:col-span-2">이메일<input name="email" required type="email" className={fieldClassName} autoComplete="off" /></label>
          <label className="grid gap-2 text-sm font-semibold">초기 비밀번호<input name="password" required type="password" className={fieldClassName} autoComplete="new-password" placeholder="영문·숫자·특수문자 포함 8자리 이상" /></label>
          <label className="grid gap-2 text-sm font-semibold">초기 비밀번호 확인<input name="passwordConfirm" required type="password" className={fieldClassName} autoComplete="new-password" /></label>
          <label className="grid gap-2 text-sm font-semibold">소속 회사
            <select name="companyId" required className={fieldClassName} defaultValue="">
              <option value="" disabled>회사를 선택하세요</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name} ({company.corporate_registration_number})</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">회사 내 지위
            <select name="memberRole" className={fieldClassName} defaultValue="member">
              <option value="member">하위 멤버</option>
              <option value="manager">관리권한</option>
              <option value="owner">소유주</option>
            </select>
          </label>
          <div className="md:col-span-2 grid gap-3 rounded-2xl bg-stone-50 p-4 text-sm">
            <label className="flex items-center gap-3 font-semibold"><input name="canViewCompany" type="checkbox" defaultChecked /> 회사 정보 조회</label>
            <label className="flex items-center gap-3 font-semibold"><input name="canViewDocuments" type="checkbox" defaultChecked /> 회사 문서 조회</label>
            <label className="flex items-center gap-3 font-semibold"><input name="canUploadRegistry" type="checkbox" /> 등기부등본 PDF 업로드</label>
            <p className="text-xs leading-5 text-stone-500">회사·문서·회원 삭제 권한은 체크 항목과 무관하게 관리자에게만 유지됩니다.</p>
          </div>
          <button disabled={working === "create-submember"} className={`${primaryButtonClassName} md:col-span-2`}>{working === "create-submember" ? "계정 생성 중..." : "하위 멤버 계정 생성"}</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 bg-stone-50 p-5">
          <h2 className="text-lg font-extrabold text-stone-950">전체 회원 및 회사별 권한</h2>
          <p className="mt-1 text-sm text-stone-500">권한 해제는 데이터 삭제가 아니라 해당 회원의 접근만 중단합니다.</p>
        </div>
        {members.length === 0 && !loading ? <p className="p-5 text-sm text-stone-500">등록된 회원이 없습니다.</p> : null}
        <div className="divide-y divide-stone-100">
          {members.map((member, index) => (
            <div key={`${member.user_id}-${member.company_id ?? "none"}-${index}`} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-stone-950">{member.display_name || "이름 미입력"} <span className="ml-2 text-xs font-semibold text-stone-500">{statusLabel(member.profile_status)}</span></p>
                  <p className="mt-1 text-sm text-stone-600">{member.email} · {member.company_name || "회사 미지정"}</p>
                </div>
                {member.profile_role !== "admin" && member.profile_status === "approved" ? (
                  <button onClick={() => void setStatus(member.user_id, "suspended")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-800">이용 정지</button>
                ) : null}
              </div>

              {member.company_id && member.member_role ? (
                <div className="mt-4 grid gap-3 rounded-2xl bg-stone-50 p-4 lg:grid-cols-[180px_1fr_auto] lg:items-center">
                  <select value={member.member_role} onChange={(event) => updateAccessRow(index, { member_role: event.target.value as MemberRow["member_role"] })} className={fieldClassName}>
                    <option value="owner">소유주</option>
                    <option value="manager">관리권한</option>
                    <option value="member">하위 멤버</option>
                  </select>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(member.can_view_company)} onChange={(event) => updateAccessRow(index, { can_view_company: event.target.checked })} />회사 조회</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(member.can_view_documents)} onChange={(event) => updateAccessRow(index, { can_view_documents: event.target.checked })} />문서 조회</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(member.can_upload_registry)} onChange={(event) => updateAccessRow(index, { can_upload_registry: event.target.checked })} />등기부 업로드</label>
                    <span className="font-semibold text-stone-500">{member.is_active ? "접근 활성" : "접근 해제"}</span>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={working === `access-${member.user_id}-${member.company_id}`} onClick={() => void saveAccess(member)} className="rounded-lg bg-emerald-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">권한 저장</button>
                    <button disabled={working === `revoke-${member.user_id}-${member.company_id}`} onClick={() => void revokeAccess(member)} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold disabled:opacity-40">접근 해제</button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
        안전장치: 일반 회원은 자신의 승인상태·관리자 역할을 변경할 수 없고, 하위 멤버는 회사/문서/회원 삭제 권한을 갖지 않습니다. 관리자 권한 변경과 접근 해제 이력은 별도 감사 로그에 기록됩니다.
      </div>
    </AccountShell>
  );
}
