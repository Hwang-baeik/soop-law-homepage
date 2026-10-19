"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccountShell, fieldClassName } from "../../../components/account-shell";
import { termNoticeRequest } from "../../../lib/supabase-browser";
import { createNoticeDraft, type NoticeCompany } from "../../../lib/term-notices";

type NoticeList = { today: string; endDate: string; companies: NoticeCompany[]; unknownCount: number; overdueCount: number };

function NoticeEditor({ company }: { company: NoticeCompany }) {
  const [draft, setDraft] = useState(() => createNoticeDraft(company));
  const [contactId, setContactId] = useState(company.contacts[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const lock = useRef(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const recipient = company.contacts.find(c => c.id === contactId);
  const send = async () => {
    if (lock.current || !recipient || sent) return;
    lock.current = true;
    setBusy(true); setMessage("");
    try {
      const response = await termNoticeRequest({ method: "POST", body: JSON.stringify({ companyId: company.id, contactId, recipient: recipient.value, revision: company.revision, ...draft }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "메일 발송에 실패했습니다.");
      setSent(true);
      setMessage(`${data.message} 접수번호: ${data.id}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "발송 상태를 확인하지 못했습니다. 같은 내용으로 다시 시도해 주세요."); }
    finally { setBusy(false); lock.current = false; }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`제목: ${draft.subject}\n\n${draft.text}`);
      setMessage("제목과 본문을 복사했습니다.");
    } catch {
      textRef.current?.focus(); textRef.current?.select();
      setMessage("자동 복사를 이용할 수 없습니다. 선택된 본문을 직접 복사해 주세요. 제목은 별도로 복사할 수 있습니다.");
    }
  };
  return <section className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5 md:p-7" aria-label={`${company.name} 안내 메일`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold">{company.name}</h2>
      <Link href={`/admin/company/${company.id}`} className="text-sm font-semibold text-emerald-900 underline">회사 정보·연락처 확인</Link>
    </div>
    <ul className="my-5 space-y-2 rounded-xl bg-stone-50 p-4 text-sm">
      {company.officers.map(o => <li key={o.source_id}><strong>{o.title} {o.person_name || "성명 미등록"}</strong> · {o.target_date} 만료 예정</li>)}
    </ul>
    <p className="mb-4 text-sm text-stone-600">보내는 주소: <strong>soop@sooplaw.com</strong></p>
    <label className="block text-sm font-semibold" htmlFor="notice-recipient">받는 사람</label>
    {company.contacts.length ? <select id="notice-recipient" className={`${fieldClassName} mt-2`} value={contactId} disabled={busy || sent} onChange={e => { setContactId(e.target.value); setMessage(""); }}>
      {company.contacts.map(c => <option key={c.id} value={c.id}>{c.is_primary ? "[대표] " : ""}{c.contact_name || c.label || "담당자"} · {c.value}</option>)}
    </select> : <p className="mt-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">유효한 이메일 연락처가 없습니다. 관리자가 회사 정보에서 이메일 연락처를 등록한 뒤 목록을 새로고침해 주세요. 문구 복사는 지금 이용할 수 있습니다.</p>}
    <label htmlFor="notice-subject" className="mt-5 block text-sm font-semibold">메일 제목</label>
    <input id="notice-subject" className={`${fieldClassName} mt-2`} maxLength={200} value={draft.subject} disabled={busy || sent} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))} />
    <label htmlFor="notice-body" className="mt-5 block text-sm font-semibold">메일 본문 · 발송 전 수정할 수 있습니다</label>
    <textarea id="notice-body" ref={textRef} className="mt-2 min-h-[460px] w-full rounded-xl border border-stone-300 p-4 text-sm leading-7 focus:outline-emerald-800" maxLength={10000} value={draft.text} disabled={busy || sent} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} />
    <p className="mt-3 text-xs leading-6 text-stone-500">내용과 수신자를 확인한 뒤 발송해 주세요. 같은 회사·수신자·내용의 재시도는 24시간 동안 중복 발송을 방지합니다. 내용이나 수신자를 바꾸면 새 메일로 발송됩니다.</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" onClick={() => void copy()} className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold">제목·본문 복사</button>
      <button type="button" onClick={() => void send()} disabled={busy || sent || !recipient || !draft.subject.trim() || !draft.text.trim()} className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "발송 접수 중…" : sent ? "발송 접수 완료" : "확인한 수신자에게 발송"}</button>
    </div>
    {message && <p role="status" className="mt-4 break-words rounded-xl bg-stone-100 p-4 text-sm leading-6">{message}</p>}
  </section>;
}

export default function TermNoticesPage() {
  const [data, setData] = useState<NoticeList | null>(null);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true); setError(""); setData(null); setSelected("");
    try {
      const response = await termNoticeRequest();
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "목록을 불러오지 못했습니다.");
      if (version === requestVersion.current) setData(result);
    } catch (e) { if (version === requestVersion.current) setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다."); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => { requestVersion.current++; }; }, [load]);
  const visible = data?.companies.filter(c => c.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) || [];
  const company = data?.companies.find(c => c.id === selected);
  return <AccountShell title="임기 만료 안내" description="오늘부터 45일 이내에 임기가 만료되는 법인을 조회하고 회사별 안내 메일을 작성합니다.">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/admin/deadlines" className="text-sm font-semibold text-emerald-900 underline">전체 기한관리 보기</Link>
      <button type="button" disabled={loading} onClick={() => { if (!company || window.confirm("작성 중인 문구가 초기화됩니다. 목록을 새로고침할까요?")) void load(); }} className="rounded-xl border border-stone-300 px-4 py-2 text-sm disabled:opacity-50">목록 새로고침</button>
    </div>
    {loading && <p role="status" className="mt-6 text-sm">임기 만료 법인을 조회하고 있습니다.</p>}
    {error && <p role="alert" className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{error}</p>}
    {data && <>
      <div className="mt-6 rounded-2xl bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-950">{data.today} ~ {data.endDate} · 한국시간 · 양 끝 날짜 포함</p>
        <p className="mt-2 text-3xl font-bold text-emerald-950">{data.companies.length}개 법인 <span className="text-sm font-normal">/ 임원 {data.companies.reduce((n, c) => n + c.officers.length, 0)}명</span></p>
      </div>
      <p className="mt-4 text-sm leading-7 text-stone-600">등록된 임기 계산값을 기준으로 조회합니다. 정관 등 원자료 확인이 필요한 일정은 발송 전 검토해 주세요. 만료일 미확정 법인 {data.unknownCount}곳과 이미 기한이 지난 법인 {data.overdueCount}곳은 <Link href="/admin/deadlines" className="font-semibold text-emerald-900 underline">전체 기한관리</Link>에서 별도로 확인할 수 있습니다.</p>
      <label htmlFor="notice-search" className="mt-6 block text-sm font-semibold">회사명 검색</label>
      <input id="notice-search" className={`${fieldClassName} mt-2`} value={search} onChange={e => setSearch(e.target.value)} placeholder="회사명을 입력해 주세요" />
      <div className="mt-4 max-h-80 space-y-2 overflow-y-auto" aria-label="45일 이내 임기 만료 회사">
        {visible.map(c => <button key={c.id} type="button" aria-pressed={selected === c.id} onClick={() => { if (!company || company.id === c.id || window.confirm("다른 회사를 선택하면 작성 중인 문구가 초기화됩니다. 계속할까요?")) setSelected(c.id); }} className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border p-4 text-left text-sm ${selected === c.id ? "border-emerald-800 bg-emerald-50" : "border-stone-200 hover:bg-stone-50"}`}>
          <span className="font-bold">{c.name}</span><span className="text-stone-600">{c.officers[0].target_date}부터 · {c.officers.length}명 · {c.contacts.length ? "이메일 등록" : "이메일 없음"}</span>
        </button>)}
        {!visible.length && <p className="rounded-xl border border-stone-200 p-6 text-center text-sm text-stone-500">{data.companies.length ? "검색 결과가 없습니다." : "45일 이내 임기 만료가 예정된 법인이 없습니다."}</p>}
      </div>
      {company ? <NoticeEditor key={`${company.id}-${company.revision}`} company={company} /> : data.companies.length > 0 && <p className="mt-6 text-sm text-stone-500">회사를 선택하면 임기 정보를 반영한 안내 문구가 작성됩니다.</p>}
    </>}
  </AccountShell>;
}
