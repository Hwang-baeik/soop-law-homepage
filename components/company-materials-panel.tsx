"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { fieldClassName, primaryButtonClassName } from "./account-shell";
import { companyMaterialsRequest } from "../lib/supabase-browser";
import { HOLDING_LABELS, MATERIAL_LABELS, type HoldingStatus, type MaterialHoldings, type MaterialType } from "../lib/company-materials";

type State = { holdings: MaterialHoldings; canManage: boolean; canRequest: boolean; email: string };
export function CompanyMaterialsPanel({ companyId }: { companyId: string }) {
  const [data, setData] = useState<State | null>(null);
  const [articles, setArticles] = useState<HoldingStatus>("unknown");
  const [register, setRegister] = useState<HoldingStatus>("unknown");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<MaterialType[]>([]);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [completed, setCompleted] = useState(false);
  const pending = useRef<{ key: string; id: string } | null>(null);
  const lock = useRef(false);
  const load = useCallback((signal?: AbortSignal) => {
    return companyMaterialsRequest(`?companyId=${encodeURIComponent(companyId)}`, { signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "보관현황을 확인하지 못했습니다.");
        if (signal?.aborted) return;
        setLoadError("");
        setData(result); setArticles(result.holdings.articles_status); setRegister(result.holdings.shareholder_register_status);
        setEmail(previous => previous || result.email);
      })
      .catch(error => { if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : "보관현황을 확인하지 못했습니다."); });
  }, [companyId]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current || !data?.canManage) return;
    try {
      lock.current = true; setWorking(true); setMessage("");
      const response = await companyMaterialsRequest("", { method: "PATCH", body: JSON.stringify({ companyId, articlesStatus: articles, shareholderRegisterStatus: register }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setMessage(result.message); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "보관현황을 저장하지 못했습니다."); }
    finally { lock.current = false; setWorking(false); }
  }
  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current || completed || !data?.canRequest) return;
    try {
      lock.current = true; setWorking(true); setMessage("");
      const types = [...selected].sort(); const replyEmail = email.trim();
      const key = JSON.stringify([companyId, types, replyEmail]);
      if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() };
      const response = await companyMaterialsRequest("", { method: "POST", body: JSON.stringify({ companyId, requestId: pending.current.id, replyEmail, types }) });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) pending.current = null; throw new Error(result.error); }
      setCompleted(true); setMessage(result.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : "요청을 처리하지 못했습니다. 같은 내용으로 다시 시도해 주세요."); }
    finally { lock.current = false; setWorking(false); }
  }
  return <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
    <h2 className="text-lg font-extrabold">사무소 자료 보관현황 · 자료 요청</h2>
    <p className="mt-2 text-sm leading-6 text-stone-600">숲 법무사 사무소의 정관·주주명부 보관 여부입니다. 자료는 사무소에서 별도로 보관하며, 홈페이지에는 파일을 업로드하지 않습니다.</p>
    {loadError ? <div role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm"><p>{loadError}</p><button type="button" onClick={() => void load()} className="mt-2 font-bold underline">다시 확인</button></div> : !data ? <p role="status" className="mt-4 text-sm">보관현황을 확인하고 있습니다.</p> : <>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">{([['articles', data.holdings.articles_status], ['shareholder_register', data.holdings.shareholder_register_status]] as const).map(([type, status]) => <div key={type} className="rounded-xl bg-stone-50 p-4"><dt className="text-sm font-bold">{MATERIAL_LABELS[type]}</dt><dd className={`mt-2 font-semibold ${status === 'held' ? 'text-emerald-800' : 'text-stone-600'}`}>{HOLDING_LABELS[status]}</dd></div>)}</dl>
      <p className="mt-3 text-xs leading-6 text-stone-500">확인일: {data.holdings.checked_at ? new Date(data.holdings.checked_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "아직 확인되지 않았습니다."} 보관 표시는 최신본·원본 여부 또는 즉시 제공을 보장하지 않습니다.</p>
      {data.canManage && <form onSubmit={save} className="mt-6 border-t border-stone-200 pt-5"><h3 className="font-bold">사무소 보관현황 수정</h3><fieldset disabled={working} className="mt-3 grid gap-3 sm:grid-cols-2">{([{ label: "정관", value: articles, set: setArticles }, { label: "주주명부", value: register, set: setRegister }]).map(item => <label key={item.label} className="grid gap-2 text-sm font-semibold">{item.label}<select value={item.value} onChange={e => item.set(e.target.value as HoldingStatus)} className={fieldClassName}>{Object.entries(HOLDING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}<button className={`${primaryButtonClassName} sm:col-span-2`}>보관현황 확인·저장</button></fieldset></form>}
      {data.canRequest ? <form onSubmit={request} className="mt-6 border-t border-stone-200 pt-5"><h3 className="font-bold">정관 · 주주명부 요청하기</h3><p className="mt-2 text-sm leading-6 text-stone-600">보관 여부가 확인되지 않았어도 요청할 수 있습니다. 사무소가 자료와 제공 권한을 확인한 뒤 회신합니다.</p><fieldset disabled={working || completed} className="mt-4 grid gap-4"><div className="flex flex-wrap gap-5">{Object.entries(MATERIAL_LABELS).map(([type, label]) => <label key={type} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(type as MaterialType)} onChange={e => setSelected(current => e.target.checked ? [...current, type as MaterialType] : current.filter(t => t !== type))} />{label}</label>)}</div><label className="grid gap-2 text-sm font-semibold">회신받을 이메일 주소<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={fieldClassName} /></label><p className="text-xs leading-6 text-stone-500">요청자료와 회신 주소가 soop@sooplaw.com으로 전달됩니다. 민감한 자료이므로 회신 주소를 정확히 입력해 주세요.</p><button disabled={selected.length === 0} className={primaryButtonClassName}>{working ? "처리 중…" : completed ? "요청 접수 완료" : "사무소에 자료 요청"}</button></fieldset>{completed && <button type="button" onClick={() => { pending.current = null; setCompleted(false); setMessage(""); }} className="mt-4 text-sm font-bold text-emerald-900 underline">새 자료 요청 작성</button>}</form> : <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">소유주·관리권한 회원에게 부여된 자료 요청 권한이 필요합니다. 사무소에 회사 연결과 권한을 확인해 주세요.</p>}
    </>}
    {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">{message}</p>}
  </section>;
}
