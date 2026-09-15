"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { fieldClassName, primaryButtonClassName } from "./account-shell";
import { getSession, rest } from "../lib/supabase-browser";

type SpecialRecord = {
  id: string;
  category: string;
  title: string;
  value_text: string | null;
  effective_date: string | null;
  due_date: string | null;
  reminder_date: string | null;
  visible_to_client: boolean;
  status: string;
  notes: string | null;
};

function labelDate(value: string | null) { return value ? value.replaceAll("-", ".") : "-"; }

export function CompanySpecialRecordsPanel({ companyId, editable = true }: { companyId: string; editable?: boolean }) {
  const [rows, setRows] = useState<SpecialRecord[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const session = getSession();
    if (!session) return;
    try {
      const response = await rest(`company_special_records?company_id=eq.${encodeURIComponent(companyId)}&status=eq.active&select=*&order=created_at.desc`, session.access_token);
      if (!response.ok) throw new Error("특별 관리정보를 불러오지 못했습니다.");
      setRows(await response.json());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "특별 관리정보 조회 중 오류가 발생했습니다.");
    }
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable) return setMessage("이 계정에는 특별 관리정보 수정 권한이 없습니다.");
    const session = getSession();
    if (!session) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      setWorking(true); setMessage("");
      const response = await rest("company_special_records", session.access_token, {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          company_id: companyId,
          category: String(data.get("category") || "기타"),
          title: String(data.get("title") || "").trim(),
          value_text: String(data.get("valueText") || "").trim() || null,
          effective_date: String(data.get("effectiveDate") || "") || null,
          due_date: String(data.get("dueDate") || "") || null,
          reminder_date: String(data.get("reminderDate") || "") || null,
          visible_to_client: data.get("visibleToClient") === "on",
          notes: String(data.get("notes") || "").trim() || null,
          created_by: session.user.id,
          updated_by: session.user.id,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "특별 관리정보를 저장하지 못했습니다.");
      }
      form.reset();
      setMessage("특별 관리정보를 저장했습니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    } finally { setWorking(false); }
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-bold tracking-[0.16em] text-emerald-800">SPECIAL DATA</p>
      <h2 className="mt-1 text-xl font-extrabold">기타 특별 관리정보</h2>
      <p className="mt-2 text-sm leading-6 text-stone-500">향후 새로운 관리항목이 생겨도 별도 개발 없이 데이터로 저장할 수 있습니다. 기준일·기한·알림일이 없는 정보도 등록할 수 있습니다.</p>
      {message && <p className="mt-4 rounded-xl bg-stone-100 p-4 text-sm text-stone-700">{message}</p>}
      {!editable && <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">이 계정은 특별 관리정보를 조회할 수 있지만 수정 권한은 없습니다.</p>}

      {editable && <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">분류<input name="category" required className={fieldClassName} placeholder="예: 주식매수선택권, 투자계약, 기타" /></label>
        <label className="grid gap-2 text-sm font-semibold">관리명<input name="title" required className={fieldClassName} /></label>
        <label className="grid gap-2 text-sm font-semibold md:col-span-2">내용<input name="valueText" className={fieldClassName} /></label>
        <label className="grid gap-2 text-sm font-semibold">기준일<input name="effectiveDate" type="date" className={fieldClassName} /></label>
        <label className="grid gap-2 text-sm font-semibold">기한일<input name="dueDate" type="date" className={fieldClassName} /></label>
        <label className="grid gap-2 text-sm font-semibold">알림일<input name="reminderDate" type="date" className={fieldClassName} /></label>
        <label className="flex items-center gap-3 rounded-xl bg-stone-50 p-4 text-sm font-semibold"><input name="visibleToClient" type="checkbox" /> 고객회사 계정에도 표시</label>
        <label className="grid gap-2 text-sm font-semibold md:col-span-2">메모<input name="notes" className={fieldClassName} /></label>
        <button disabled={working} className={`${primaryButtonClassName} md:col-span-2`}>특별 관리정보 저장</button>
      </form>}

      <div className="mt-6 grid gap-3">
        {rows.length === 0 ? <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">등록된 기타 특별 관리정보가 없습니다.</p> : rows.map((row) => (
          <article key={row.id} className="rounded-xl border border-stone-200 p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-emerald-800">{row.category}</p><p className="mt-1 font-extrabold">{row.title}</p></div>{row.reminder_date && <span className="rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-900">알림 {labelDate(row.reminder_date)}</span>}</div>
            {row.value_text && <p className="mt-3 text-stone-700">{row.value_text}</p>}
            <p className="mt-2 text-stone-500">기준일 {labelDate(row.effective_date)} · 기한일 {labelDate(row.due_date)}{row.visible_to_client ? " · 고객 공개" : " · 내부관리"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
