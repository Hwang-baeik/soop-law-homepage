"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AccountShell, fieldClassName } from "../../../components/account-shell";
import { termNoticeRequest } from "../../../lib/supabase-browser";
import { createNoticeDraft, defaultNoticeContact, noticeBatchSize, noticeRanges, noticeSender, type NoticeCompany, type NoticeMail, type NoticeRange, type NoticeSendResult } from "../../../lib/term-notices";
import { makeZip } from "../../../lib/zip";

type NoticeList = { today: string; companies: NoticeCompany[]; unknownCount: number };
type Review = { company: NoticeCompany; contactId: string; subject: string; text: string };
const outline = "rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-50";
const primary = "rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50";

function downloadNotices(rows: Pick<Review, "company" | "subject" | "text">[], today: string) {
  const encoder = new TextEncoder();
  const files = rows.map(({ company, subject, text }, index) => {
    const name = company.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 64).trim() || "법인";
    return {
      name: `${String(index + 1).padStart(3, "0")}_${name}_중임안내.txt`,
      data: encoder.encode(`\uFEFF제목: ${subject}\n\n${text}`.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n")),
    };
  });
  const url = URL.createObjectURL(new Blob([makeZip(files)], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `법인별_중임안내_${today}.zip`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ReviewRow({ row, busy, result, onChange }: {
  row: Review; busy: boolean; result?: NoticeSendResult; onChange: (patch: Partial<Review>) => void;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const sent = Boolean(result?.id);
  return <tr className="border-t border-stone-200 align-top">
    <th scope="row" className="p-4 text-left font-semibold">
      <Link href={`/admin/company/${row.company.id}`} className="underline">{row.company.name}</Link>
    </th>
    <td className="p-4">{noticeSender}</td>
    <td className="min-w-60 p-4">
      {row.company.contacts.length ? <select className={fieldClassName} aria-label={`${row.company.name} 수신 이메일`}
        disabled={busy || sent} value={row.contactId} onChange={event => onChange({ contactId: event.target.value })}>
        <option value="">수신 이메일 선택</option>
        {row.company.contacts.map(c => <option key={c.id} value={c.id}>{c.is_primary ? "[대표] " : ""}{c.value}{c.contact_name ? ` · ${c.contact_name}` : ""}</option>)}
      </select> : <span className="text-amber-900">이메일 없음 · TXT 저장 가능</span>}
    </td>
    <td className="min-w-60 p-4">
      <details>
        <summary className="cursor-pointer font-semibold text-emerald-900">제목·본문 보기</summary>
        <ul className="my-3 space-y-1 text-stone-600">
          {row.company.officers.map(o => <li key={o.source_id}>{o.title} {o.person_name} · {o.target_date}</li>)}
        </ul>
        <label className="block font-semibold">제목
          <input className={`${fieldClassName} mt-1`} maxLength={200} disabled={busy || sent} value={row.subject} onChange={event => onChange({ subject: event.target.value })} />
        </label>
        <label className="mt-3 block font-semibold">본문
          <textarea className={`${fieldClassName} mt-1 min-h-60 font-normal`} maxLength={10000} disabled={busy || sent} value={row.text} onChange={event => onChange({ text: event.target.value })} />
        </label>
        <button type="button" className={`${outline} mt-2`} onClick={async () => {
          try {
            await navigator.clipboard.writeText(`제목: ${row.subject}\n\n${row.text}`);
            setCopyStatus("복사했습니다.");
          } catch {
            setCopyStatus("제목과 본문을 직접 복사해 주세요.");
          }
        }}>제목·본문 복사</button>
        {copyStatus && <p role="status" className="mt-2">{copyStatus}</p>}
      </details>
    </td>
    <td className="min-w-36 p-4">
      {sent ? <span className="font-semibold text-emerald-900" title={result?.id}>발송 접수 완료</span> :
        result ? <span className="text-amber-900">{result.message}</span> :
          row.contactId ? "발송 대기" : "수신 주소 확인 필요"}
    </td>
  </tr>;
}

export default function TermNoticesPage() {
  const [data, setData] = useState<NoticeList | null>(null);
  const [range, setRange] = useState<NoticeRange>("upcoming");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set<string>());
  const [review, setReview] = useState<Review[] | null>(null);
  const [results, setResults] = useState<Record<string, NoticeSendResult>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState("");
  const [reload, setReload] = useState(0);
  const sendLock = useRef(false);
  const selectAll = useRef<HTMLInputElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const reviewing = review !== null;

  function resetList() {
    setLoading(true);
    setError("");
    setData(null);
    setSelected(new Set());
    setReview(null);
    setResults({});
    setProgress("");
  }
  useEffect(() => {
    const controller = new AbortController();
    termNoticeRequest({ signal: controller.signal }, range).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "목록을 불러오지 못했습니다.");
      if (!controller.signal.aborted) setData(result);
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "목록을 불러오지 못했습니다.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [range, reload]);
  useEffect(() => { if (reviewing) reviewHeading.current?.focus(); }, [reviewing]);

  const visible = data?.companies.filter(c => c.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) ?? [];
  const visibleSelected = visible.filter(c => selected.has(c.id)).length;
  const allVisible = visible.length > 0 && visibleSelected === visible.length;
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = visibleSelected > 0 && !allVisible;
  }, [visibleSelected, allVisible, reviewing]);
  const toggle = (ids: string[], checked: boolean) => setSelected(previous => {
    const next = new Set(previous);
    for (const id of ids) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    return next;
  });

  function beginReview() {
    const companies = data?.companies.filter(c => selected.has(c.id)) ?? [];
    setReview(companies.map(company => ({ company, contactId: defaultNoticeContact(company.contacts), ...createNoticeDraft(company) })));
    setProgress("");
  }

  const pending = (review ?? []).filter(row => !results[row.company.id]?.id);
  const ready = pending.filter(row => row.contactId && row.subject.trim() && row.text.trim());
  async function sendReviewed() {
    if (!ready.length || sendLock.current) return;
    sendLock.current = true;
    setSending(true);
    const mails: NoticeMail[] = ready.map(row => ({
      companyId: row.company.id,
      contactId: row.contactId,
      recipient: row.company.contacts.find(c => c.id === row.contactId)!.value,
      revision: row.company.revision,
      subject: row.subject,
      text: row.text,
    }));
    const received: NoticeSendResult[] = [];
    try {
      for (let i = 0; i < mails.length; i += noticeBatchSize) {
        const batch = mails.slice(i, i + noticeBatchSize);
        setProgress(`${mails.length}개 중 ${i + 1}~${i + batch.length}번째 발송을 처리하고 있습니다. 이 화면을 열어두세요.`);
        const response = await termNoticeRequest({ method: "POST", body: JSON.stringify({ range, mails: batch }) }, range, true);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "일괄 발송 상태를 확인하지 못했습니다.");
        const group: NoticeSendResult[] = result.results;
        received.push(...group);
        setResults(previous => ({ ...previous, ...Object.fromEntries(group.map(item => [item.companyId, item])) }));
        if (i + noticeBatchSize < mails.length) await new Promise(resolve => setTimeout(resolve, 550));
      }
      const accepted = received.filter(item => item.id).length;
      setProgress(`이번 발송에서 ${accepted}개 접수 완료, ${received.length - accepted}개 확인 필요.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "발송 상태를 확인하지 못했습니다.";
      setProgress(`현재까지 ${received.filter(item => item.id).length}개 접수 완료. ${message} 미확인 메일은 같은 내용으로 다시 시도해 주세요.`);
    } finally {
      setSending(false);
      sendLock.current = false;
    }
  }

  return <AccountShell title="임기 만료 안내" description="임기 만료 구간을 조회하고 회사별 안내 메일을 검토한 뒤 발송합니다.">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/admin/deadlines" className="text-sm font-semibold text-emerald-900 underline">전체 기한관리 보기</Link>
      <button type="button" className={outline} disabled={loading || sending} onClick={() => {
        if (!review || window.confirm("현재 검토 목록을 닫고 최신 데이터를 불러올까요?")) {
          resetList();
          setReload(value => value + 1);
        }
      }}>목록 새로고침</button>
    </div>
    {loading && <p role="status" className="mt-6 text-sm">임기 만료 법인을 조회하고 있습니다.</p>}
    {error && <p role="alert" className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{error}</p>}

    {!review && <section className="mt-6">
      <h2 className="text-lg font-bold">1. 발송할 회사 선택</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">임기 만료 구간
          <select className={`${fieldClassName} mt-1`} value={range} onChange={event => {
            resetList();
            setRange(event.target.value as NoticeRange);
          }}>
            {Object.entries(noticeRanges).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">회사명 검색
          <input className={`${fieldClassName} mt-1`} value={search} onChange={event => setSearch(event.target.value)} placeholder="회사명을 입력해 주세요" />
        </label>
      </div>
      {data && <>
        <p className="mt-4 text-sm text-stone-600">{data.today} 한국시간 기준 · 조회 {data.companies.length}개 법인 · 만료일 미확정 {data.unknownCount}개 법인</p>
        <p className="mt-2 text-sm text-stone-600">예약 안내는 임기 만료일 오전 9시대에 발송됩니다. 아래에서 선택한 안내는 검토 화면의 발송 버튼을 누르면 접수됩니다.</p>
        <div className="mt-3 rounded-xl border border-stone-200">
          <label className="flex items-center gap-2 bg-stone-50 p-4 text-sm font-semibold">
            <input ref={selectAll} type="checkbox" checked={allVisible} disabled={!visible.length} onChange={event => toggle(visible.map(c => c.id), event.target.checked)} />
            현재 목록 전체 선택 ({visibleSelected}/{visible.length})
          </label>
          <ul className="max-h-96 divide-y divide-stone-200 overflow-y-auto">
            {visible.map(c => <li key={c.id}>
              <label className="flex flex-wrap items-center gap-2 p-4 text-sm">
                <input type="checkbox" checked={selected.has(c.id)} onChange={event => toggle([c.id], event.target.checked)} />
                <span className="font-semibold">{c.name}</span>
                <span className="text-stone-600">{c.officers[0].target_date} · 임원 {c.officers.length}명 · {c.contacts.length ? `이메일 ${c.contacts.length}건` : "이메일 없음"}</span>
              </label>
            </li>)}
          </ul>
          {!visible.length && <p className="p-4 text-sm text-stone-600">현재 조건에 해당하는 법인이 없습니다.</p>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={primary} disabled={!selected.size} onClick={beginReview}>선택한 {selected.size}개 법인 검토</button>
          <button type="button" className={outline} disabled={!data.companies.length}
            onClick={() => downloadNotices(data.companies.map(company => ({ company, ...createNoticeDraft(company) })), data.today)}>조회 법인 전체 안내문 저장 (TXT ZIP)</button>
          {selected.size > visibleSelected && <span className="text-sm text-stone-600">검색에 표시되지 않는 선택 {selected.size - visibleSelected}개 포함</span>}
        </div>
      </>}
    </section>}

    {review && data && <section className="mt-6">
      <h2 ref={reviewHeading} tabIndex={-1} className="text-lg font-bold">2. 발신·수신 이메일 및 안내문 검토</h2>
      <p className="mt-2 text-sm text-stone-600">{noticeRanges[range]} · 선택 {review.length}개 법인. 회사별로 메일을 한 통씩 발송합니다.</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50">
            <tr>{["회사", "발신 이메일", "수신 이메일", "안내문", "발송 상태"].map(label => <th key={label} scope="col" className="p-4">{label}</th>)}</tr>
          </thead>
          <tbody>{review.map(row => <ReviewRow key={row.company.id} row={row} busy={sending} result={results[row.company.id]}
            onChange={patch => {
              setReview(previous => previous?.map(item => item.company.id === row.company.id ? { ...item, ...patch } : item) ?? null);
              setResults(previous => {
                const next = { ...previous };
                delete next[row.company.id];
                return next;
              });
            }} />)}</tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={outline} disabled={sending} onClick={() => {
          if (window.confirm("회사 선택으로 돌아가면 발송 전 수정한 문구와 수신 주소 선택이 초기화됩니다. 계속할까요?")) setReview(null);
        }}>회사 선택으로 돌아가기</button>
        <button type="button" className={outline} onClick={() => downloadNotices(review, data.today)}>선택한 회사 안내문 저장 (TXT ZIP)</button>
      </div>
      <div className="mt-6 border-t border-stone-200 pt-5">
        <h2 className="text-lg font-bold">3. 검토한 메일 일괄 발송</h2>
        <p className="mt-2 text-sm text-stone-600">발송 가능 {ready.length}개 · 수신 주소 또는 내용 확인 필요 {pending.length - ready.length}개 · 접수 완료 {review.length - pending.length}개</p>
        <button type="button" className={`${primary} mt-3`} disabled={sending || !ready.length} onClick={() => void sendReviewed()}>
          {sending ? "메일 발송 중…" : `검토한 ${ready.length}개 메일 일괄 발송`}
        </button>
        {progress && <p role="status" className="mt-3 text-sm text-stone-700">{progress}</p>}
      </div>
    </section>}
  </AccountShell>;
}
