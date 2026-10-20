"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { fieldClassName, primaryButtonClassName } from "./account-shell";
import { validateNewEmail, validatePersonalInfo } from "../lib/account-settings";
import { getAccountUser, getSession, requestOwnEmailChange, rest, type AccountUser } from "../lib/supabase-browser";

type Profile = { id: string; display_name: string; phone: string; role: string };

export function PersonalSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState("");
  const [loadError, setLoadError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const lock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setLoadError("");
      try {
        const account = await getAccountUser();
        const session = getSession();
        if (!session || session.user.id !== account.id) throw new Error("다시 로그인해 주세요.");
        const response = await rest(`profiles?id=eq.${encodeURIComponent(account.id)}&select=id,display_name,phone,role`, session.access_token);
        if (!response.ok) throw new Error("회원정보를 불러오지 못했습니다.");
        const data: Profile | undefined = (await response.json())[0];
        if (!data || data.id !== getSession()?.user.id) throw new Error("회원정보를 확인하지 못했습니다.");
        if (!cancelled) { setProfile(data); setUser(account); setName(data.display_name || ""); setPhone(data.phone || ""); }
      } catch (error) { if (!cancelled) setLoadError(error instanceof Error ? error.message : "회원정보 조회 중 오류가 발생했습니다."); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [retry]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !profile) return;
    try {
      const data = validatePersonalInfo(name, phone);
      const session = getSession();
      if (!session || session.user.id !== profile.id) throw new Error("다시 로그인해 주세요.");
      lock.current = true; setBusy("profile"); setProfileMessage("");
      const response = await rest(`profiles?id=eq.${encodeURIComponent(profile.id)}&select=id,display_name,phone,role`, session.access_token, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(data) });
      if (!response.ok) throw new Error("개인정보를 저장하지 못했습니다. 입력 내용과 로그인 상태를 확인해 주세요.");
      const saved: Profile | undefined = (await response.json())[0];
      if (!saved || saved.id !== getSession()?.user.id) throw new Error("개인정보 저장을 확인하지 못했습니다. 새로고침 후 확인해 주세요.");
      setProfile(saved); setName(saved.display_name); setPhone(saved.phone);
      setProfileMessage("이름과 연락처가 변경되었습니다.");
    } catch (error) { setProfileMessage(error instanceof Error ? error.message : "개인정보 저장 중 오류가 발생했습니다."); }
    finally { lock.current = false; setBusy(""); }
  }

  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !user) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    try {
      const email = validateNewEmail(String(form.get("email") || ""));
      if (email.toLowerCase() === user.email?.toLowerCase()) throw new Error("현재 주소와 다른 이메일을 입력해 주세요.");
      lock.current = true; setBusy("email"); setEmailMessage("");
      const result = await requestOwnEmailChange(email, String(form.get("password") || ""));
      if (getSession()?.user.id !== result.id) throw new Error("로그인 계정이 변경되었습니다. 다시 확인해 주세요.");
      setUser(result); element.reset();
      if (result.email?.toLowerCase() === email.toLowerCase()) {
        await getAccountUser();
        setEmailMessage("로그인 이메일이 변경되었습니다. 다음 로그인부터 변경한 주소를 사용해 주세요.");
      } else {
        setEmailMessage("이메일 변경 인증을 요청했습니다. 기존 주소와 새 주소의 받은편지함·스팸함을 확인하고 수신한 인증메일의 절차를 모두 완료해 주세요. 인증 전에는 현재 이메일로 로그인합니다.");
      }
    } catch (error) { setEmailMessage(error instanceof Error ? error.message : "이메일 변경 중 오류가 발생했습니다."); }
    finally { lock.current = false; setBusy(""); }
  }

  if (loading) return <p role="status" className="rounded-xl bg-stone-50 p-5 text-sm">내 회원정보를 불러오고 있습니다.</p>;
  if (loadError) return <div role="alert" className="rounded-xl bg-amber-50 p-5 text-sm"><p>{loadError}</p><button type="button" onClick={() => setRetry(n => n + 1)} className="mt-3 font-semibold underline">다시 불러오기</button></div>;
  return <>
    <div className="flex flex-wrap gap-4 text-sm font-semibold text-emerald-900">
      <Link href={profile?.role === "admin" || profile?.role === "staff" ? "/admin/companies" : "/mypage"}>관리 회사 보기 →</Link>
      {profile?.role === "admin" && <Link href="/admin/security">2단계 인증·보안 →</Link>}
    </div>
    <section className="rounded-2xl border border-stone-200 p-5">
      <h2 className="text-lg font-bold">내 개인정보</h2>
      <p className="mt-2 break-all text-sm text-stone-600">로그인 이메일: {user?.email}</p>
      <form onSubmit={saveProfile} className="mt-5 grid gap-4">
        <fieldset disabled={Boolean(busy)} className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">이름<input required maxLength={100} autoComplete="name" className={fieldClassName} value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="grid gap-2 text-sm font-semibold">연락처<input required maxLength={30} type="tel" autoComplete="tel" className={fieldClassName} value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" /></label>
          <button className={primaryButtonClassName}>{busy === "profile" ? "저장 중…" : "개인정보 저장"}</button>
        </fieldset>
        {profileMessage && <p role="status" className="rounded-xl bg-stone-50 p-4 text-sm leading-6">{profileMessage}</p>}
      </form>
      <p className="mt-4 text-xs leading-6 text-stone-500">회사명·법인등록번호·회사 연락처와 접근 권한은 사무소에서 별도로 관리합니다. 본인의 이름·연락처 변경으로 회사 자료가 바뀌지 않습니다.</p>
    </section>
    <section className="rounded-2xl border border-stone-200 p-5">
      <h2 className="text-lg font-bold">로그인 이메일 변경</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">현재 비밀번호 확인과 이메일 인증을 거쳐 로그인 주소를 변경합니다. 인증 완료 후 마이페이지를 새로고침하면 변경된 주소를 확인할 수 있습니다.</p>
      {user?.new_email && <p className="mt-3 break-all rounded-xl bg-amber-50 p-4 text-sm">인증 대기 중인 주소: {user.new_email}</p>}
      <form onSubmit={changeEmail} className="mt-5 grid gap-4">
        <fieldset disabled={Boolean(busy)} className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">새 이메일<input required name="email" type="email" maxLength={254} autoComplete="email" className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold">이메일 변경 확인용 현재 비밀번호<input required name="password" type="password" autoComplete="current-password" className={fieldClassName} /></label>
          <button className={primaryButtonClassName}>{busy === "email" ? "인증 요청 중…" : "이메일 변경 인증 요청"}</button>
        </fieldset>
        {emailMessage && <p role="status" className="rounded-xl bg-stone-50 p-4 text-sm leading-7">{emailMessage}</p>}
      </form>
    </section>
  </>;
}
