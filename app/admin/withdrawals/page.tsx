"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell } from "../../../components/account-shell";
import { getSession, invokeFunction, rest } from "../../../lib/supabase-browser";

type Withdrawal = {
  id: string;
  user_id: string | null;
  reason: string | null;
  status: "requested" | "reviewing" | "completed" | "cancelled";
  requested_at: string;
  reviewed_at: string | null;
  admin_note: string | null;
  completed_at: string | null;
};

type Member = { user_id: string; email: string; display_name: string; role: string; status: string };

function statusLabel(status: Withdrawal["status"]) {
  if (status === "requested") return "요청";
  if (status === "reviewing") return "검토중";
  if (status === "completed") return "삭제완료";
  return "취소";
}

export default function WithdrawalAdminPage() {
  const router = useRouter();
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");

  const memberMap = useMemo(() => new Map(members.map((m) => [m.user_id, m])), [members]);

  const load = useCallback(async () => {
    const session = getSession();
    if (!session) return router.replace("/login");
    const profileResponse = await rest(`profiles?id=eq.${session.user.id}&select=role,status`, session.access_token);
    const profile = (await profileResponse.json())?.[0];
    if (!profile || profile.role !== "admin" || profile.status !== "approved") return router.replace("/mypage");

    const [requestResponse, memberResponse] = await Promise.all([
      rest("account_withdrawal_requests?select=*&order=requested_at.desc", session.access_token),
      rest("rpc/admin_list_members", session.access_token, { method: "POST", body: JSON.stringify({}) }),
    ]);
    if (requestResponse.ok) setItems(await requestResponse.json());
    if (memberResponse.ok) setMembers(await memberResponse.json());
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function review(item: Withdrawal, status: "reviewing" | "cancelled") {
    const session = getSession(); if (!session) return;
    const note = status === "cancelled" ? prompt("취소 사유 또는 관리자 메모를 입력해 주세요.") : prompt("검토 메모를 입력해 주세요. (선택)");
    if (note === null) return;
    try {
      setWorking(item.id); setMessage("");
      const response = await rest("rpc/admin_review_withdrawal", session.access_token, {
        method: "POST",
        body: JSON.stringify({ p_request_id: item.id, p_status: status, p_note: note || null }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "처리하지 못했습니다.");
      }
      setMessage(status === "cancelled" ? "탈퇴 요청을 취소하고 계정 이용상태를 복구했습니다." : "검토중 상태로 변경했습니다.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "처리 중 오류가 발생했습니다."); }
    finally { setWorking(""); }
  }

  async function complete(item: Withdrawal) {
    const session = getSession(); if (!session) return;
    const member = item.user_id ? memberMap.get(item.user_id) : null;
    const ok = confirm(`${member?.display_name || member?.email || "이 계정"}의 로그인 계정과 회원 프로필·회사 접근권한을 최종 삭제합니다. 회사의 등기·사건·문서 원본은 삭제하지 않습니다. 계속하시겠습니까?`);
    if (!ok) return;
    try {
      setWorking(item.id); setMessage("");
      const response = await invokeFunction("admin-delete-withdrawn-user", session.access_token, { request_id: item.id });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "계정 삭제에 실패했습니다.");
      setMessage("회원 계정 개인정보를 삭제했습니다. 회사 업무자료는 유지됩니다.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다."); }
    finally { setWorking(""); }
  }

  return (
    <AccountShell title="회원탈퇴 관리" description="탈퇴 요청 즉시 접근은 중지되며, 관리자 검토 후 계정 개인정보를 최종 삭제합니다.">
      {message && <p className="mb-5 rounded-xl bg-stone-100 p-4 text-sm text-stone-700">{message}</p>}
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <b>처리 원칙</b><br />법령·사건처리·분쟁대응 등 보존 필요가 있는 회사 업무자료는 계정삭제 대상과 분리합니다. 최종삭제는 로그인 인증정보, 회원 프로필, 회사 접근권한을 대상으로 합니다.
      </div>
      <div className="grid gap-4">
        {items.length === 0 && <p className="rounded-xl bg-stone-50 p-5 text-sm text-stone-500">탈퇴 요청이 없습니다.</p>}
        {items.map((item) => {
          const member = item.user_id ? memberMap.get(item.user_id) : null;
          return <article key={item.id} className="rounded-2xl border border-stone-200 bg-white p-5 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-extrabold">{member?.display_name || (item.status === "completed" ? "삭제 완료 계정" : "회원")}</p><p className="mt-1 text-stone-500">{member?.email || "개인식별정보 삭제됨"}</p></div>
              <span className="rounded-full bg-stone-100 px-3 py-1 font-bold">{statusLabel(item.status)}</span>
            </div>
            <p className="mt-3 text-stone-600">요청일 {new Date(item.requested_at).toLocaleString("ko-KR")}</p>
            {item.reason && <p className="mt-2 rounded-xl bg-stone-50 p-3 text-stone-700">사유: {item.reason}</p>}
            {item.admin_note && <p className="mt-2 text-stone-600">관리자 메모: {item.admin_note}</p>}
            {(item.status === "requested" || item.status === "reviewing") && <div className="mt-4 flex flex-wrap gap-2">
              {item.status === "requested" && <button disabled={working === item.id} onClick={() => void review(item, "reviewing")} className="rounded-lg border border-stone-300 px-3 py-2 font-bold">검토중으로</button>}
              <button disabled={working === item.id} onClick={() => void review(item, "cancelled")} className="rounded-lg border border-stone-300 px-3 py-2 font-bold">요청 취소·복구</button>
              <button disabled={working === item.id} onClick={() => void complete(item)} className="rounded-lg bg-red-800 px-3 py-2 font-bold text-white">개인정보 최종삭제</button>
            </div>}
          </article>;
        })}
      </div>
    </AccountShell>
  );
}
