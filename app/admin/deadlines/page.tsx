"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell } from "../../../components/account-shell";
import { getSession, rest } from "../../../lib/supabase-browser";

type Deadline = {
  source_type: "officer" | "term_item";
  source_id: string;
  company_id: string;
  company_name: string;
  category: string;
  title: string;
  person_name: string | null;
  target_date: string | null;
  reminder_date: string | null;
  status: string;
  details: Record<string, unknown>;
};

function dateLabel(value: string | null) {
  return value ? value.replaceAll("-", ".") : "미확정";
}

export default function DeadlineAdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Deadline[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const session = getSession();
      if (!session) { router.replace("/login"); return; }
      try {
        const profileResponse = await rest(`profiles?id=eq.${session.user.id}&select=role,status`, session.access_token);
        const profile = (await profileResponse.json())?.[0];
        if (!profile || profile.status !== "approved" || !["admin", "staff"].includes(profile.role)) {
          router.replace("/mypage"); return;
        }
        const response = await rest("rpc/list_upcoming_company_deadlines", session.access_token, { method: "POST", body: "{}" });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "기한정보를 불러오지 못했습니다.");
        }
        setRows(await response.json());
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "기한정보 조회 중 오류가 발생했습니다.");
      } finally { setLoading(false); }
    };
    void load();
  }, [router]);

  const today = new Date().toISOString().slice(0, 10);
  const due = useMemo(() => rows.filter((r) => r.reminder_date && r.reminder_date <= today), [rows, today]);
  const upcoming = useMemo(() => rows.filter((r) => !r.reminder_date || r.reminder_date > today), [rows, today]);

  const cards = (items: Deadline[]) => items.map((row) => (
    <Link key={`${row.source_type}-${row.source_id}`} href={`/admin/company/${row.company_id}`} className="block rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-emerald-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-emerald-800">{row.category}</p>
          <p className="mt-1 font-extrabold text-stone-950">{row.company_name}</p>
          <p className="mt-1 text-sm text-stone-700">{row.title}{row.person_name ? ` · ${row.person_name}` : ""}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.reminder_date && row.reminder_date <= today ? "bg-amber-100 text-amber-950" : "bg-stone-100 text-stone-700"}`}>알림 {dateLabel(row.reminder_date)}</span>
      </div>
      <p className="mt-3 text-sm text-stone-500">기준 기한 {dateLabel(row.target_date)}</p>
    </Link>
  ));

  return (
    <AccountShell title="기한관리" description="임원 임기와 전환사채·전환주식·상환주식 등 특별 관리정보의 알림시점을 한 곳에서 확인합니다.">
      {message && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
      {loading ? <p className="text-sm text-stone-500">기한정보를 불러오는 중입니다.</p> : <>
        <section>
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-[0.14em] text-amber-800">ACTION REQUIRED</p><h2 className="mt-1 text-xl font-extrabold">준비 알림 도래</h2></div><span className="text-sm font-bold text-amber-900">{due.length}건</span></div>
          <p className="mt-2 text-sm leading-6 text-stone-500">정기주주총회 종결형 임원은 해당 개최연도 1월 1일부터 이 목록에 표시됩니다. 그 외 임원은 임기말이 속한 달의 초일 1개월 전부터 표시됩니다.</p>
          <div className="mt-4 grid gap-3">{due.length ? cards(due) : <p className="rounded-xl bg-stone-50 p-5 text-sm text-stone-500">현재 도래한 준비 알림이 없습니다.</p>}</div>
        </section>
        <section className="mt-8">
          <div className="flex items-end justify-between gap-3"><h2 className="text-xl font-extrabold">향후 예정</h2><span className="text-sm font-bold text-stone-500">{upcoming.length}건</span></div>
          <div className="mt-4 grid gap-3">{upcoming.length ? cards(upcoming) : <p className="rounded-xl bg-stone-50 p-5 text-sm text-stone-500">등록된 향후 기한이 없습니다.</p>}</div>
        </section>
      </>}
    </AccountShell>
  );
}
