"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { fieldClassName, primaryButtonClassName } from "./account-shell";
import { getSession, rest } from "../lib/supabase-browser";

type Officer = {
  id: string;
  position: string;
  officer_name: string;
  term_start_date: string;
  term_years: number;
  expires_at_regular_agm: boolean;
  expected_regular_agm_month: number | null;
  actual_regular_agm_date: string | null;
  calculated_term_end_date: string | null;
  reminder_date: string | null;
  status: string;
  notes: string | null;
};

type TermItem = {
  id: string;
  item_type: "convertible_bond" | "convertible_share" | "redeemable_share" | "other";
  title: string;
  start_date: string | null;
  end_date: string;
  reminder_months_before: number;
  reminder_date: string | null;
  requires_cancellation_registration: boolean;
  status: string;
  notes: string | null;
};

function itemLabel(type: TermItem["item_type"]) {
  if (type === "convertible_bond") return "전환사채";
  if (type === "convertible_share") return "전환주식";
  if (type === "redeemable_share") return "상환주식";
  return "기타";
}

function dateLabel(value: string | null) {
  return value ? value.replaceAll("-", ".") : "미확정";
}

export function CompanyManagementPanel({ companyId, editable = true }: { companyId: string; editable?: boolean }) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [termItems, setTermItems] = useState<TermItem[]>([]);
  const [position, setPosition] = useState("사내이사");
  const [agmExpiry, setAgmExpiry] = useState(false);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");

  const load = useCallback(async () => {
    const session = getSession();
    if (!session) return;
    try {
      const [officerResponse, termResponse] = await Promise.all([
        rest(`company_officers?company_id=eq.${encodeURIComponent(companyId)}&status=neq.deleted&select=*&order=reminder_date.asc.nullslast,term_start_date.asc`, session.access_token),
        rest(`company_term_items?company_id=eq.${encodeURIComponent(companyId)}&select=*&order=reminder_date.asc.nullslast,end_date.asc`, session.access_token),
      ]);
      if (!officerResponse.ok || !termResponse.ok) throw new Error("임원·기간정보를 불러오지 못했습니다.");
      setOfficers(await officerResponse.json());
      setTermItems(await termResponse.json());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "임원·기간정보 조회 중 오류가 발생했습니다.");
    }
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  function handlePosition(next: string) {
    setPosition(next);
    if (next.includes("감사")) setAgmExpiry(true);
  }

  async function addOfficer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable) return setMessage("이 계정에는 임원정보 수정 권한이 없습니다.");
    const session = getSession();
    if (!session) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      setWorking("officer"); setMessage("");
      const body = {
        company_id: companyId,
        position,
        officer_name: String(data.get("officerName") || "").trim(),
        term_start_date: String(data.get("termStartDate") || ""),
        term_years: Number(data.get("termYears") || 3),
        expires_at_regular_agm: agmExpiry,
        expected_regular_agm_month: agmExpiry ? Number(data.get("agmMonth") || 3) : null,
        notes: String(data.get("notes") || "").trim() || null,
        created_by: session.user.id,
        updated_by: session.user.id,
      };
      const response = await rest("company_officers", session.access_token, {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "임원정보를 저장하지 못했습니다.");
      }
      form.reset(); setPosition("사내이사"); setAgmExpiry(false);
      setMessage("임원정보를 저장하고 알림일을 자동 계산했습니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "임원정보 저장 중 오류가 발생했습니다.");
    } finally { setWorking(""); }
  }

  async function addTermItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable) return setMessage("이 계정에는 기간정보 수정 권한이 없습니다.");
    const session = getSession();
    if (!session) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      setWorking("term"); setMessage("");
      const body = {
        company_id: companyId,
        item_type: String(data.get("itemType") || "other"),
        title: String(data.get("title") || "").trim(),
        start_date: String(data.get("startDate") || "") || null,
        end_date: String(data.get("endDate") || ""),
        reminder_months_before: Number(data.get("reminderMonths") || 1),
        requires_cancellation_registration: data.get("requiresCancellation") === "on",
        notes: String(data.get("notes") || "").trim() || null,
        created_by: session.user.id,
        updated_by: session.user.id,
      };
      const response = await rest("company_term_items", session.access_token, {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "기간정보를 저장하지 못했습니다.");
      }
      form.reset();
      setMessage("기간정보를 저장하고 알림일을 자동 계산했습니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "기간정보 저장 중 오류가 발생했습니다.");
    } finally { setWorking(""); }
  }

  async function updateStatus(table: "company_officers" | "company_term_items", id: string, status: string) {
    if (!editable) return setMessage("이 계정에는 상태 변경 권한이 없습니다.");
    const session = getSession();
    if (!session) return;
    try {
      setWorking(id); setMessage("");
      const response = await rest(`${table}?id=eq.${encodeURIComponent(id)}`, session.access_token, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status, updated_by: session.user.id }),
      });
      if (!response.ok) throw new Error("상태를 변경하지 못했습니다.");
      setMessage("상태를 변경했습니다. 기존 기록은 삭제하지 않고 보존합니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "상태 변경 중 오류가 발생했습니다.");
    } finally { setWorking(""); }
  }

  async function setActualAgmDate(event: FormEvent<HTMLFormElement>, officerId: string) {
    event.preventDefault();
    if (!editable) return;
    const session = getSession();
    if (!session) return;
    const date = String(new FormData(event.currentTarget).get("actualAgmDate") || "");
    if (!date) return setMessage("실제 정기주주총회 개최일을 입력해 주세요.");
    try {
      setWorking(`agm-${officerId}`); setMessage("");
      const response = await rest(`company_officers?id=eq.${encodeURIComponent(officerId)}`, session.access_token, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ actual_regular_agm_date: date, updated_by: session.user.id }),
      });
      if (!response.ok) throw new Error("정기주주총회 개최일을 저장하지 못했습니다.");
      setMessage("실제 정기주주총회 개최일을 반영해 임기말을 확정했습니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "정기주주총회일 저장 중 오류가 발생했습니다.");
    } finally { setWorking(""); }
  }

  return (
    <div className="grid gap-8">
      {message && <p className="rounded-xl bg-stone-100 p-4 text-sm leading-6 text-stone-700">{message}</p>}
      {!editable && <p className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">이 계정은 임원·기간정보를 조회할 수 있지만 수정 권한은 없습니다.</p>}

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-emerald-800">OFFICERS</p>
          <h2 className="mt-1 text-xl font-extrabold">임원 임기관리</h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">일반 임기는 기한월 초일 1개월 전에, 정기주주총회 종결형은 해당 정기주총 개최연도 1월 1일에 알림 대상으로 잡습니다.</p>
        </div>

        {editable && <form onSubmit={addOfficer} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">직책
            <select value={position} onChange={(e) => handlePosition(e.target.value)} className={fieldClassName}>
              <option>대표이사</option><option>사내이사</option><option>사외이사</option><option>기타비상무이사</option><option>감사</option><option>기타</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">성명<input name="officerName" required className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold">임기 기산일<input name="termStartDate" required type="date" className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold">정관상 기본 임기
            <select name="termYears" defaultValue="3" className={fieldClassName}><option value="1">1년</option><option value="2">2년</option><option value="3">3년</option><option value="4">4년</option><option value="5">5년</option></select>
          </label>
          <label className="md:col-span-2 flex items-center gap-3 rounded-xl bg-stone-50 p-4 text-sm font-semibold">
            <input type="checkbox" checked={agmExpiry} onChange={(e) => setAgmExpiry(e.target.checked)} /> 마지막 임기가 속한 사업연도의 정기주주총회 종결 시까지
          </label>
          {agmExpiry && <label className="grid gap-2 text-sm font-semibold">예상 정기주주총회 월
            <select name="agmMonth" defaultValue="3" className={fieldClassName}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}월</option>)}</select>
          </label>}
          <label className="grid gap-2 text-sm font-semibold md:col-span-2">메모<input name="notes" className={fieldClassName} /></label>
          <button disabled={working === "officer"} className={`${primaryButtonClassName} md:col-span-2`}>임원정보 저장</button>
        </form>}

        <div className="mt-6 grid gap-3">
          {officers.length === 0 ? <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">등록된 임원이 없습니다.</p> : officers.map((officer) => (
            <article key={officer.id} className="rounded-xl border border-stone-200 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-extrabold text-stone-950">{officer.position} · {officer.officer_name}</p><p className="mt-1 text-stone-600">기산일 {dateLabel(officer.term_start_date)} · {officer.term_years}년</p></div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-900">알림 {dateLabel(officer.reminder_date)}</span>
              </div>
              <p className="mt-3 text-stone-600">{officer.expires_at_regular_agm ? `정기주총 종결형 · 예상 ${officer.expected_regular_agm_month || "-"}월 · 실제 임기말 ${dateLabel(officer.calculated_term_end_date)}` : `계산 임기말 ${dateLabel(officer.calculated_term_end_date)}`}</p>
              {editable && officer.expires_at_regular_agm && officer.status === "active" && (
                <form onSubmit={(event) => void setActualAgmDate(event, officer.id)} className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-stone-50 p-3">
                  <label className="grid gap-1 text-xs font-semibold">실제 정기주주총회일<input name="actualAgmDate" type="date" defaultValue={officer.actual_regular_agm_date || ""} className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-sm" /></label>
                  <button disabled={working === `agm-${officer.id}`} className="h-9 rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold">임기말 확정</button>
                </form>
              )}
              {editable && officer.status === "active" && <div className="mt-3 flex gap-2"><button disabled={working === officer.id} onClick={() => void updateStatus("company_officers", officer.id, "renewed")} className="rounded-lg border border-stone-300 px-3 py-2 font-semibold">중임·갱신 처리</button><button disabled={working === officer.id} onClick={() => void updateStatus("company_officers", officer.id, "resigned")} className="rounded-lg border border-stone-300 px-3 py-2 font-semibold">퇴임 처리</button></div>}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-xs font-bold tracking-[0.16em] text-emerald-800">TERM DATA</p>
        <h2 className="mt-1 text-xl font-extrabold">전환사채·전환주식·상환주식 등 기간관리</h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">기간 말일과 사전 알림시점을 구조화하여 저장합니다. 기간 경과 후 말소등기가 필요한 항목인지도 함께 관리합니다.</p>
        {editable && <form onSubmit={addTermItem} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">종류<select name="itemType" className={fieldClassName} defaultValue="convertible_bond"><option value="convertible_bond">전환사채</option><option value="convertible_share">전환주식</option><option value="redeemable_share">상환주식</option><option value="other">기타</option></select></label>
          <label className="grid gap-2 text-sm font-semibold">관리명<input name="title" required className={fieldClassName} placeholder="예: 제1회 전환사채 전환기간" /></label>
          <label className="grid gap-2 text-sm font-semibold">기간 시작일<input name="startDate" type="date" className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold">기간 말일<input name="endDate" required type="date" className={fieldClassName} /></label>
          <label className="grid gap-2 text-sm font-semibold">몇 개월 전 알림<select name="reminderMonths" defaultValue="1" className={fieldClassName}><option value="0">해당월 초</option><option value="1">1개월 전</option><option value="2">2개월 전</option><option value="3">3개월 전</option><option value="6">6개월 전</option><option value="12">12개월 전</option></select></label>
          <label className="flex items-center gap-3 rounded-xl bg-stone-50 p-4 text-sm font-semibold"><input name="requiresCancellation" type="checkbox" defaultChecked /> 기간 경과 후 말소등기 확인 필요</label>
          <label className="grid gap-2 text-sm font-semibold md:col-span-2">메모<input name="notes" className={fieldClassName} /></label>
          <button disabled={working === "term"} className={`${primaryButtonClassName} md:col-span-2`}>기간정보 저장</button>
        </form>}

        <div className="mt-6 grid gap-3">
          {termItems.length === 0 ? <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">등록된 기간정보가 없습니다.</p> : termItems.map((item) => (
            <article key={item.id} className="rounded-xl border border-stone-200 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-extrabold">{itemLabel(item.item_type)} · {item.title}</p><p className="mt-1 text-stone-600">말일 {dateLabel(item.end_date)} {item.requires_cancellation_registration ? "· 말소등기 확인 필요" : ""}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-900">알림 {dateLabel(item.reminder_date)}</span></div>
              {editable && item.status === "active" && <button disabled={working === item.id} onClick={() => void updateStatus("company_term_items", item.id, "completed")} className="mt-3 rounded-lg border border-stone-300 px-3 py-2 font-semibold">처리완료</button>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
