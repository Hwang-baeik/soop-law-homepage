"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../components/account-shell";
import { clearSession, getSession, rest, signIn } from "../../lib/supabase-browser";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function requestWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session?.user.email) return router.replace("/login");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmText = String(form.get("confirmText") || "").trim();
    const reason = String(form.get("reason") || "").trim();
    if (confirmText !== "회원탈퇴") return setMessage("확인란에 ‘회원탈퇴’를 정확히 입력해 주세요.");

    try {
      setWorking(true); setMessage("");
      const verified = await signIn(session.user.email, password);
      const profileResponse = await rest(`profiles?id=eq.${verified.user.id}&select=role,status`, verified.access_token);
      const profile = (await profileResponse.json())?.[0];
      if (!profile) throw new Error("회원정보를 확인하지 못했습니다.");
      if (profile.role === "admin") throw new Error("관리자 계정은 사이트에서 탈퇴할 수 없습니다.");

      const response = await rest("rpc/request_account_withdrawal", verified.access_token, {
        method: "POST",
        body: JSON.stringify({ p_reason: reason || null }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "탈퇴 요청을 처리하지 못했습니다.");
      }
      clearSession();
      alert("탈퇴 요청이 접수되었습니다. 회사 접근권한은 즉시 중지되며, 보존 필요자료 확인 후 계정 개인정보가 삭제됩니다.");
      router.replace("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "탈퇴 요청 중 오류가 발생했습니다.");
    } finally { setWorking(false); }
  }

  return (
    <AccountShell title="계정 및 개인정보" description="비밀번호 변경, 개인정보 처리방침 확인, 회원탈퇴 요청을 관리합니다.">
      <div className="grid gap-6">
        <section className="rounded-2xl border border-stone-200 p-5">
          <h2 className="font-extrabold">계정 보안</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">비밀번호는 다른 서비스와 중복 사용하지 않는 것을 권장합니다.</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold"><Link href="/change-password" className="text-emerald-900">비밀번호 변경 →</Link><Link href="/privacy" className="text-emerald-900">개인정보 처리방침 →</Link></div>
        </section>

        <section className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
          <h2 className="font-extrabold text-red-950">회원탈퇴</h2>
          <p className="mt-2 text-sm leading-6 text-red-900/80">탈퇴 요청 즉시 회사 접근권한이 중지되고 로그아웃됩니다. 회사 등기·사건·문서 자료는 계정 소유자의 개인자료와 구분하여, 법령 또는 업무상 보존이 필요한 경우 유지될 수 있습니다. 관리자가 보존 여부를 검토한 뒤 로그인 계정과 회원 프로필을 최종 삭제합니다.</p>
          <form onSubmit={requestWithdrawal} className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">현재 비밀번호<input required name="password" type="password" className={fieldClassName} autoComplete="current-password" /></label>
            <label className="grid gap-2 text-sm font-semibold">탈퇴 사유 (선택)<textarea name="reason" rows={3} className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-800" /></label>
            <label className="grid gap-2 text-sm font-semibold">확인을 위해 ‘회원탈퇴’ 입력<input required name="confirmText" className={fieldClassName} /></label>
            <button disabled={working} className={`${primaryButtonClassName} !bg-red-800 hover:!bg-red-900`}>{working ? "처리 중..." : "회원탈퇴 요청"}</button>
            {message && <p className="rounded-xl bg-white p-4 text-sm text-red-900">{message}</p>}
          </form>
        </section>
      </div>
    </AccountShell>
  );
}
