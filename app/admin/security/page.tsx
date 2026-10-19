"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell, fieldClassName, primaryButtonClassName } from "../../../components/account-shell";
import { challengeMfa, enrollTotp, getJwtAal, getSession, listMfaFactors, saveSession, verifyMfa, type MfaFactor } from "../../../lib/supabase-browser";

export default function AdminSecurityPage() {
  const router = useRouter();
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [aal, setAal] = useState("aal1");

  async function reload() {
    const session = getSession();
    if (!session) { router.replace("/login"); return; }
    setAal(getJwtAal(session.access_token));
    try {
      const list = await listMfaFactors(session.access_token);
      setFactors(list);
      const verified = list.find((item) => item.status === "verified");
      if (verified) setFactorId(verified.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "MFA 상태를 확인하지 못했습니다.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, []);

  async function startEnrollment() {
    const session = getSession();
    if (!session) return router.replace("/login");
    try {
      setWorking(true); setMessage("");
      const data = await enrollTotp(session.access_token);
      setFactorId(data.id);
      setQrCode(data.totp?.qr_code || "");
      setSecret(data.totp?.secret || "");
      setMessage("인증 앱에서 QR 코드를 등록한 뒤 6자리 코드를 입력해 주세요.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "MFA 등록을 시작하지 못했습니다."); }
    finally { setWorking(false); }
  }

  async function verifyCode() {
    const session = getSession();
    if (!session) return router.replace("/login");
    if (!factorId || code.trim().length < 6) return setMessage("인증 앱의 6자리 코드를 입력해 주세요.");
    try {
      setWorking(true); setMessage("");
      const challenge = await challengeMfa(session.access_token, factorId);
      const upgraded = await verifyMfa(session.access_token, factorId, challenge.id, code.trim());
      saveSession(upgraded);
      setAal(getJwtAal(upgraded.access_token));
      setQrCode(""); setSecret(""); setCode("");
      setMessage("2단계 인증이 완료되었습니다. 이 세션은 관리자 권한 작업이 허용됩니다.");
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "2단계 인증에 실패했습니다."); }
    finally { setWorking(false); }
  }

  const verified = factors.some((item) => item.status === "verified");

  return (
    <AccountShell title="관리자 보안" description="관리자 계정은 인증 앱(TOTP) 2단계 인증을 사용할 수 있습니다. MFA를 등록하면 이후 관리자 권한 작업은 MFA 인증된 세션에서만 허용됩니다.">
      {loading ? <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">보안 상태를 확인하는 중입니다.</p> : (
        <div className="grid gap-6">
          <div className={`rounded-2xl border p-5 ${verified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <p className="font-bold">MFA 등록 상태: {verified ? "등록됨" : "미등록"}</p>
            <p className="mt-1 text-sm">현재 세션 보안 수준: <strong>{aal}</strong></p>
            <p className="mt-2 text-sm leading-6 text-stone-600">MFA가 등록된 관리자 계정은 DB 권한검사에서도 AAL2 세션만 관리자 권한으로 인정합니다.</p>
          </div>

          {!verified && !qrCode && <button disabled={working} onClick={() => void startEnrollment()} className={primaryButtonClassName}>{working ? "등록 준비 중..." : "인증 앱 2단계 인증 등록"}</button>}

          {qrCode && (
            <div className="grid gap-4 rounded-2xl border border-stone-200 p-5">
              <p className="font-bold">1. Google Authenticator, Microsoft Authenticator, 1Password 등의 인증 앱에서 아래 QR 코드를 스캔하세요.</p>
              <img src={qrCode} alt="MFA QR 코드" className="mx-auto max-w-64 rounded-xl border bg-white p-3" />
              {secret && <div className="rounded-xl bg-stone-50 p-3 text-xs break-all"><strong>수동 입력키:</strong> {secret}</div>}
            </div>
          )}

          {(verified && aal !== "aal2") || qrCode ? (
            <div className="grid gap-3 rounded-2xl border border-stone-200 p-5">
              <label className="grid gap-2 text-sm font-semibold">인증 앱 6자리 코드<input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" className={fieldClassName} placeholder="000000" /></label>
              <button disabled={working} onClick={() => void verifyCode()} className={primaryButtonClassName}>{working ? "확인 중..." : "2단계 인증 확인"}</button>
            </div>
          ) : null}

          {verified && aal === "aal2" && <button onClick={() => router.push("/admin")} className={primaryButtonClassName}>관리자 화면으로 이동</button>}
          {message && <p className="rounded-xl bg-stone-100 p-4 text-sm leading-6 text-stone-700">{message}</p>}
        </div>
      )}
    </AccountShell>
  );
}
