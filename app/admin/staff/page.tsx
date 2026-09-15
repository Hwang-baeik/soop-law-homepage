"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
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

export default function StaffAdminPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

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
    const profileResponse = await rest(`profiles?id=eq.${session.user.id}&select=role,status`, session.access_token);
    const profile = (await profileResponse.json())?.[0];
    if (!profile || profile.role !== "admin" || profile.status !== "approved") { router.replace("/mypage"); return; }
    const [memberResponse, companyResponse] = await Promise.all([
      rest("rpc/admin_list_members", session.access_token, { method: "POST", body: "{}" }),
      rest("companies?select=id,name,corporate_registration_number&order=name.asc", session.access_token),
    ]);
    const memberRows: Member[] = await memberResponse.json();
    setMembers(memberRows.filter((row, index, all) => all.findIndex((x) => x.user_id === row.user_id) === index));
    setCompanies(await companyResponse.json());
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const displayName = String(data.get("displayName") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const password = String(data.get("password") || "");
    const confirm = String(data.get("passwordConfirm") || "");
    if (!PASSWORD_PATTERN.test(password)) { setMessage("초기 비밀번호는 영문·숫자·특수문자를 포함한 8자리 이상이어야 합니다."); return; }
    if (password !== confirm) { setMessage("비밀번호 확인이 일치하지 않습니다."); return; }

    try {
      setWorking(true); setMessage("");
      const result = await signUp(email, password, { display_name: displayName, phone });
      const userId = result.user?.id;
      if (!userId) throw new Error("직원 계정을 생성하지 못했습니다.");
      await callRpc("admin_set_staff_permissions", {
        target_user: userId,
        p_can_manage_members: data.get("manageMembers") === "on",
        p_can_manage_companies: data.get("manageCompanies") === "on",
        p_can_manage_documents: data.get("manageDocuments") === "on",
        p_can_manage_deadlines: data.get("manageDeadlines") === "on",
        p_can_manage_staff: false,
        p_can_view_audit_log: false,
        p_is_active: true,
      });
      form.reset();
      setMessage("사무소 직원계정을 생성했습니다. 직원은 이메일 인증 후 로그인할 수 있습니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "직원계정 생성 중 오류가 발생했습니다.");
    } finally { setWorking(false); }
  }

  async function assignCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const targetCompany = String(data.get("companyId") || "");
    if (!selectedStaff || !targetCompany) { setMessage("직원과 회사를 선택해 주세요."); return; }
    try {
      setWorking(true); setMessage("");
      await callRpc("admin_assign_staff_company", {
        target_user: selectedStaff,
        target_company: targetCompany,
        p_can_view: true,
        p_can_edit_company_data: data.get("editCompany") === "on",
        p_can_manage_documents: data.get("manageDocuments") === "on",
        p_can_manage_deadlines: data.get("manageDeadlines") === "on",
      });
      setMessage("직원의 담당회사와 권한을 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "담당회사 저장 중 오류가 발생했습니다.");
    } finally { setWorking(false); }
  }

  const staff = members.filter((m) => m.profile_role === "staff");

  return (
    <AccountShell title="직원관리" description="숲 법무사 사무소 내부 직원계정과 담당회사 권한을 관리합니다. 고객회사 하위계정과는 별도 체계입니다.">
      {message && <p className="mb-6 rounded-xl bg-stone-100 p-4 text-sm text-stone-700">{message}</p>}

      <section className="rounded-2xl border border-stone-200 p-5">
        <h2 className="text-lg font-extrabold">사무소 직원계정 생성</h2>
        <form onSubmit={createStaff} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">이름<input name="displayName" required className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold">연락처<input name="phone" required className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold md:col-span-2">이메일<input name="email" type="email" required className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold">초기 비밀번호<input name="password" type="password" required className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold">비밀번호 확인<input name="passwordConfirm" type="password" required className={fieldClassName} /></label>
          <div className="md:col-span-2 grid gap-3 rounded-xl bg-stone-50 p-4 text-sm">
            <label><input name="manageMembers" type="checkbox" className="mr-2" />회원관리</label>
            <label><input name="manageCompanies" type="checkbox" defaultChecked className="mr-2" />회사정보 관리</label>
            <label><input name="manageDocuments" type="checkbox" defaultChecked className="mr-2" />문서 관리</label>
            <label><input name="manageDeadlines" type="checkbox" defaultChecked className="mr-2" />임원·기간정보 및 기한 관리</label>
          </div>
          <button disabled={working} className={`${primaryButtonClassName} md:col-span-2`}>직원계정 생성</button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 p-5">
        <h2 className="text-lg font-extrabold">직원별 담당회사 지정</h2>
        <form onSubmit={assignCompany} className="mt-5 grid gap-4">
          <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className={fieldClassName}>
            <option value="">직원을 선택하세요</option>
            {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.display_name} · {s.email}</option>)}
          </select>
          <select name="companyId" defaultValue="" className={fieldClassName} required>
            <option value="" disabled>담당회사를 선택하세요</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.corporate_registration_number})</option>)}
          </select>
          <div className="grid gap-3 rounded-xl bg-stone-50 p-4 text-sm">
            <label><input name="editCompany" type="checkbox" defaultChecked className="mr-2" />회사 관리데이터 수정</label>
            <label><input name="manageDocuments" type="checkbox" defaultChecked className="mr-2" />문서 관리</label>
            <label><input name="manageDeadlines" type="checkbox" defaultChecked className="mr-2" />기한 관리</label>
          </div>
          <button disabled={working} className={primaryButtonClassName}>담당회사 권한 저장</button>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-stone-200 p-5">
        <h2 className="text-lg font-extrabold">현재 직원계정</h2>
        <div className="mt-4 grid gap-3">
          {staff.length === 0 ? <p className="text-sm text-stone-500">등록된 직원계정이 없습니다.</p> : staff.map((s) => (
            <div key={s.user_id} className="rounded-xl bg-stone-50 p-4 text-sm">
              <p className="font-bold">{s.display_name}</p><p className="mt-1 text-stone-600">{s.email} · {s.phone}</p>
            </div>
          ))}
        </div>
      </section>
    </AccountShell>
  );
}
