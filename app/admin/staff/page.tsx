"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../../components/account-shell";
import { PASSWORD_PATTERN } from "../../../lib/member-types";
import { getSession, rest, signUp } from "../../../lib/supabase-browser";

type Member = {
  user_id: string;
  email: string;
  display_name: string;
  phone: string;
  profile_role: "admin" | "staff" | "client";
  profile_status: "pending" | "approved" | "rejected" | "suspended";
};

type Company = { id: string; name: string; corporate_registration_number: string };
type StaffPermission = {
  user_id: string;
  can_manage_companies: boolean;
  can_manage_documents: boolean;
  can_manage_deadlines: boolean;
  is_active: boolean;
};

type PermissionDraft = {
  companies: boolean;
  documents: boolean;
  deadlines: boolean;
  active: boolean;
};

const defaultPermissions: PermissionDraft = { companies: true, documents: true, deadlines: true, active: true };

export default function StaffAdminPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [permissions, setPermissions] = useState<Record<string, StaffPermission>>({});
  const [selectedStaff, setSelectedStaff] = useState("");
  const [permissionDraft, setPermissionDraft] = useState<PermissionDraft>(defaultPermissions);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");

  const callRpc = useCallback(async (name: string, payload: Record<string, unknown>) => {
    const session = getSession();
    if (!session) throw new Error("로그인이 필요합니다.");
    const response = await rest(`rpc/${name}`, session.access_token, { method: "POST", body: JSON.stringify(payload) });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.details || "처리하지 못했습니다.");
    }
    return response;
  }, []);

  const load = useCallback(async () => {
    const session = getSession();
    if (!session) { router.replace("/login"); return; }
    try {
      const profileResponse = await rest(`profiles?id=eq.${session.user.id}&select=role,status`, session.access_token);
      if (!profileResponse.ok) throw new Error("관리자 정보를 확인하지 못했습니다.");
      const profile = (await profileResponse.json())?.[0];
      if (!profile || profile.role !== "admin" || profile.status !== "approved") { router.replace("/mypage"); return; }

      const [memberResponse, companyResponse, permissionResponse] = await Promise.all([
        rest("rpc/admin_list_members", session.access_token, { method: "POST", body: "{}" }),
        rest("companies?select=id,name,corporate_registration_number&order=name.asc", session.access_token),
        rest("office_staff_permissions?select=user_id,can_manage_companies,can_manage_documents,can_manage_deadlines,is_active", session.access_token),
      ]);
      if (!memberResponse.ok || !companyResponse.ok || !permissionResponse.ok) throw new Error("직원 관리정보를 불러오지 못했습니다.");

      const memberRows: Member[] = await memberResponse.json();
      setMembers(memberRows.filter((row, index, all) => all.findIndex((x) => x.user_id === row.user_id) === index));
      setCompanies(await companyResponse.json());
      const permissionRows: StaffPermission[] = await permissionResponse.json();
      setPermissions(Object.fromEntries(permissionRows.map((row) => [row.user_id, row])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "직원 관리정보 조회 중 오류가 발생했습니다.");
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const current = permissions[selectedStaff];
    setPermissionDraft(current ? {
      companies: current.can_manage_companies,
      documents: current.can_manage_documents,
      deadlines: current.can_manage_deadlines,
      active: current.is_active,
    } : defaultPermissions);
  }, [selectedStaff, permissions]);

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const displayName = String(data.get("displayName") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const password = String(data.get("password") || "");
    const confirm = String(data.get("passwordConfirm") || "");
    if (!PASSWORD_PATTERN.test(password)) { setMessage("초기 비밀번호는 영문, 숫자, 특수문자를 포함하여 12자리 이상이어야 합니다."); return; }
    if (password !== confirm) { setMessage("비밀번호 확인이 일치하지 않습니다."); return; }

    try {
      setWorking("create"); setMessage("");
      const result = await signUp(email, password, { display_name: displayName, phone });
      const userId = result.user?.id;
      if (!userId) throw new Error("직원 계정을 생성하지 못했습니다.");
      if (Array.isArray(result.user?.identities) && result.user?.identities?.length === 0) throw new Error("이미 가입된 이메일입니다. 기존 계정을 직원으로 전환하려면 회원관리에서 계정 상태를 먼저 확인해 주세요.");

      await callRpc("admin_set_staff_permissions", {
        target_user: userId,
        p_can_manage_members: false,
        p_can_manage_companies: data.get("manageCompanies") === "on",
        p_can_manage_documents: data.get("manageDocuments") === "on",
        p_can_manage_deadlines: data.get("manageDeadlines") === "on",
        p_can_manage_staff: false,
        p_can_view_audit_log: false,
        p_is_active: true,
      });
      form.reset();
      setMessage("사무소 직원계정을 생성했습니다. 직원은 이메일 인증 후 최초 로그인에서 비밀번호를 변경해야 합니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "직원계정 생성 중 오류가 발생했습니다.");
    } finally { setWorking(""); }
  }

  async function saveGlobalPermissions() {
    if (!selectedStaff) { setMessage("직원을 선택해 주세요."); return; }
    try {
      setWorking("permissions"); setMessage("");
      await callRpc("admin_set_staff_permissions", {
        target_user: selectedStaff,
        p_can_manage_members: false,
        p_can_manage_companies: permissionDraft.companies,
        p_can_manage_documents: permissionDraft.documents,
        p_can_manage_deadlines: permissionDraft.deadlines,
        p_can_manage_staff: false,
        p_can_view_audit_log: false,
        p_is_active: permissionDraft.active,
      });
      setMessage("직원 기본 권한을 저장했습니다. 회사별 담당권한은 아래에서 별도로 제한할 수 있습니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "직원 권한 저장 중 오류가 발생했습니다.");
    } finally { setWorking(""); }
  }

  async function assignCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const targetCompany = String(data.get("companyId") || "");
    if (!selectedStaff || !targetCompany) { setMessage("직원과 회사를 선택해 주세요."); return; }
    try {
      setWorking("assignment"); setMessage("");
      await callRpc("admin_assign_staff_company", {
        target_user: selectedStaff,
        target_company: targetCompany,
        p_can_view: true,
        p_can_edit_company_data: data.get("editCompany") === "on",
        p_can_manage_documents: data.get("manageDocuments") === "on",
        p_can_manage_deadlines: data.get("manageDeadlines") === "on",
      });
      setMessage("직원의 담당회사와 회사별 권한을 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "담당회사 저장 중 오류가 발생했습니다.");
    } finally { setWorking(""); }
  }

  const staff = useMemo(() => members.filter((member) => member.profile_role === "staff"), [members]);

  return (
    <AccountShell title="직원관리" description="숲 법무사 사무소 내부 직원계정과 담당회사 권한을 관리합니다. 고객회사 하위계정과는 별도 체계입니다.">
      {message && <p className="mb-6 rounded-xl bg-stone-100 p-4 text-sm leading-6 text-stone-700">{message}</p>}

      <section className="rounded-2xl border border-stone-200 p-5">
        <h2 className="text-lg font-extrabold">사무소 직원계정 생성</h2>
        <p className="mt-1 text-sm text-stone-500">회원 승인·회원-회사 연결은 현재 관리자 전용으로 유지하고, 직원에게는 회사·문서·기한 관리 권한만 선택적으로 부여합니다.</p>
        <form onSubmit={createStaff} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">이름<input name="displayName" required className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold">연락처<input name="phone" required className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold md:col-span-2">이메일<input name="email" type="email" required className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold">초기 비밀번호<input name="password" type="password" required className={fieldClassName} placeholder="영문·숫자·특수문자 포함 12자리 이상" /></label>
          <label className="grid gap-2 text-sm font-semibold">비밀번호 확인<input name="passwordConfirm" type="password" required className={fieldClassName} /></label>
          <div className="md:col-span-2 grid gap-3 rounded-xl bg-stone-50 p-4 text-sm">
            <label><input name="manageCompanies" type="checkbox" defaultChecked className="mr-2" />회사정보 관리</label>
            <label><input name="manageDocuments" type="checkbox" defaultChecked className="mr-2" />문서 관리</label>
            <label><input name="manageDeadlines" type="checkbox" defaultChecked className="mr-2" />임원·기간정보 및 기한 관리</label>
          </div>
          <button disabled={working === "create"} className={`${primaryButtonClassName} md:col-span-2`}>{working === "create" ? "직원계정 생성 중..." : "직원계정 생성"}</button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 p-5">
        <h2 className="text-lg font-extrabold">직원 기본 권한</h2>
        <select value={selectedStaff} onChange={(event) => setSelectedStaff(event.target.value)} className={`${fieldClassName} mt-4`}>
          <option value="">직원을 선택하세요</option>
          {staff.map((item) => <option key={item.user_id} value={item.user_id}>{item.display_name} · {item.email}</option>)}
        </select>
        {selectedStaff && <div className="mt-4 grid gap-3 rounded-xl bg-stone-50 p-4 text-sm">
          <label><input type="checkbox" checked={permissionDraft.companies} onChange={(e) => setPermissionDraft((p) => ({ ...p, companies: e.target.checked }))} className="mr-2" />회사정보 관리</label>
          <label><input type="checkbox" checked={permissionDraft.documents} onChange={(e) => setPermissionDraft((p) => ({ ...p, documents: e.target.checked }))} className="mr-2" />문서 관리</label>
          <label><input type="checkbox" checked={permissionDraft.deadlines} onChange={(e) => setPermissionDraft((p) => ({ ...p, deadlines: e.target.checked }))} className="mr-2" />임원·기간정보 및 기한 관리</label>
          <label className="font-bold"><input type="checkbox" checked={permissionDraft.active} onChange={(e) => setPermissionDraft((p) => ({ ...p, active: e.target.checked }))} className="mr-2" />직원계정 활성</label>
          <button type="button" onClick={() => void saveGlobalPermissions()} disabled={working === "permissions"} className={primaryButtonClassName}>기본 권한 저장</button>
        </div>}
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 p-5">
        <h2 className="text-lg font-extrabold">직원별 담당회사 지정</h2>
        <p className="mt-1 text-sm text-stone-500">위에서 선택한 직원에게 특정 회사를 배정합니다. 기본 권한과 회사별 권한이 모두 허용된 범위에서만 실제 기능이 작동합니다.</p>
        <form onSubmit={assignCompany} className="mt-5 grid gap-4">
          <select name="companyId" defaultValue="" className={fieldClassName} required>
            <option value="" disabled>담당회사를 선택하세요</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name} ({company.corporate_registration_number})</option>)}
          </select>
          <div className="grid gap-3 rounded-xl bg-stone-50 p-4 text-sm">
            <label><input name="editCompany" type="checkbox" defaultChecked className="mr-2" />회사 관리데이터 수정</label>
            <label><input name="manageDocuments" type="checkbox" defaultChecked className="mr-2" />문서 관리</label>
            <label><input name="manageDeadlines" type="checkbox" defaultChecked className="mr-2" />기한 관리</label>
          </div>
          <button disabled={!selectedStaff || working === "assignment"} className={primaryButtonClassName}>담당회사 권한 저장</button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 p-5">
        <h2 className="text-lg font-extrabold">현재 직원계정</h2>
        <div className="mt-4 grid gap-3">
          {staff.length === 0 ? <p className="text-sm text-stone-500">등록된 직원계정이 없습니다.</p> : staff.map((item) => {
            const permission = permissions[item.user_id];
            return <button type="button" onClick={() => setSelectedStaff(item.user_id)} key={item.user_id} className="rounded-xl bg-stone-50 p-4 text-left text-sm hover:bg-stone-100">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">{item.display_name}</p><p className="mt-1 text-stone-600">{item.email} · {item.phone}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${permission?.is_active ? "bg-emerald-100 text-emerald-900" : "bg-stone-200 text-stone-600"}`}>{permission?.is_active ? "활성" : "비활성"}</span></div>
            </button>;
          })}
        </div>
      </section>
    </AccountShell>
  );
}
