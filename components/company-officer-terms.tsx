"use client";
import { useEffect, useState } from "react";
import { getSession, rest } from "../lib/supabase-browser";
type Officer = { id: string; officer_name: string; position: string; term_start_date: string; term_years: number; calculated_term_end_date: string | null; expires_at_regular_agm: boolean; actual_regular_agm_date: string | null };
export function CompanyOfficerTerms({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<Officer[] | null>(null); const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const session = getSession(); if (!session) throw new Error("다시 로그인해 주세요.");
        const response = await rest(`company_officers?company_id=eq.${encodeURIComponent(companyId)}&status=eq.active&select=id,officer_name,position,term_start_date,term_years,calculated_term_end_date,expires_at_regular_agm,actual_regular_agm_date&order=calculated_term_end_date.asc.nullslast`, session.access_token, { signal: controller.signal });
        if (!response.ok) throw new Error("임원 임기를 불러오지 못했습니다.");
        const result = await response.json(); if (!controller.signal.aborted) { setRows(result); setError(""); }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "임원 임기를 불러오지 못했습니다."); }
    })();
    return () => controller.abort();
  }, [companyId, retry]);
  return <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5"><h2 className="text-lg font-extrabold">임원 임기</h2><p className="mt-2 text-xs leading-6 text-stone-500">등록된 기준일과 임기 설정에 따른 관리정보입니다. 정기주주총회 종결 조건 등은 사무소 확인이 필요합니다.</p>{error ? <div role="alert" className="mt-4 text-sm text-amber-900">{error}<button onClick={() => setRetry(n => n + 1)} className="ml-3 underline">다시 확인</button></div> : !rows ? <p role="status" className="mt-4 text-sm">임기를 확인하고 있습니다.</p> : rows.length === 0 ? <p className="mt-4 text-sm text-stone-500">등록된 재임 임원이 없습니다.</p> : <div className="mt-4 grid gap-3">{rows.map(row => <article key={row.id} className="rounded-xl bg-stone-50 p-4"><h3 className="font-bold">{row.position} {row.officer_name}</h3><p className="mt-2 text-sm">기준일 {row.term_start_date || "확인 필요"} · 임기 {row.term_years}년</p><p className="mt-1 text-sm">{row.expires_at_regular_agm ? "정기주주총회 종결 조건 적용" : "관리상 만료일"}: {row.calculated_term_end_date || "확인 필요"}</p>{row.expires_at_regular_agm && <p className="mt-1 text-xs text-stone-500">실제 정기주주총회일: {row.actual_regular_agm_date || "미등록 — 표시된 날짜는 관리용 예상일일 수 있습니다."}</p>}</article>)}</div>}</section>;
}
