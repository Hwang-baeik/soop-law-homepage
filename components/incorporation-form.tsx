"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  choices, companyFields, companyTypes, emptyPerson, initialSurvey, nameResults,
  roles, surveyText, UNKNOWN, validateSurvey, type Person, type Survey,
} from "../lib/incorporation";
import { PurposePicker } from "./incorporation-purpose-picker";

const inputClass = "min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base font-normal text-stone-950 focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200";
const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 px-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50";
const sections = [
  ["contact-details", "담당자"], ["company-details", "회사 정보"], ["business-purposes", "사업목적"],
  ["officers", "임원"], ["shareholders", "주주·사원"], ["certificate", "전자증명서"], ["notes", "기타"],
] as const;

function Field({ label, value, onChange, placeholder, required, type = "text", maxLength = 300 }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string;
  required?: boolean; type?: "text" | "email" | "tel"; maxLength?: number;
}) {
  return (
    <label className="grid content-start gap-2 text-sm font-semibold text-stone-700">
      <span>{label}{required && <span className="text-red-700"> (필수)</span>}</span>
      <input className={inputClass} type={type} value={value} onChange={event => onChange(event.target.value)}
        placeholder={placeholder} required={required} maxLength={maxLength} />
    </label>
  );
}

function Select({ label, value, onChange, options, disabled }: {
  label: string; value: string; onChange: (value: string) => void; options: readonly string[]; disabled?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-700">
      {label}
      <select className={inputClass + " disabled:bg-stone-100"} value={value} onChange={event => onChange(event.target.value)} disabled={disabled}>
        {options.map(option => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-44 space-y-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
      <h2 className="text-xl font-bold text-stone-950">{title}</h2>
      {children}
    </section>
  );
}

type PersonRow = Person & { id: number };

function People({ entries, shareholder = false, onChange }: {
  entries: PersonRow[]; shareholder?: boolean; onChange: (entries: PersonRow[]) => void;
}) {
  const nextId = useRef(1);
  const maximum = shareholder ? 20 : 10;
  const noun = shareholder ? "주주·사원" : "임원";
  const addButton = useRef<HTMLButtonElement>(null);
  const focusId = useRef<number | null>(null);
  const lastRow = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    if (entries.at(-1)?.id !== focusId.current) return;
    lastRow.current?.querySelector("input")?.focus();
    focusId.current = null;
  }, [entries]);

  return (
    <div className="space-y-3">
      {entries.map((person, index) => {
        const update = (key: keyof Person, value: string) => onChange(entries.map(entry => entry.id === person.id ? { ...entry, [key]: value } : entry));
        const rowLabel = `${noun} ${index + 1}`;
        return (
          <fieldset key={person.id} ref={index === entries.length - 1 ? lastRow : undefined} className="rounded-xl border border-stone-200 p-3 sm:p-4">
            <legend className="px-2 text-sm font-bold text-emerald-900">{rowLabel}</legend>
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label={shareholder ? "성명 또는 법인명" : "성명"} value={person.name} onChange={value => update("name", value)} maxLength={60} />
              {shareholder
                ? <Field label="지분율 (%)" placeholder="예: 60 또는 미정" value={person.share} onChange={value => update("share", value)} maxLength={10} />
                : <Select label="직위" value={person.role} onChange={value => update("role", value)} options={roles} />}
              {entries.length > 1 && (
                <button type="button" className={buttonClass + " justify-self-start"} aria-label={rowLabel + " 삭제"} onClick={() => {
                  onChange(entries.filter(entry => entry.id !== person.id));
                  addButton.current?.focus();
                }}>삭제</button>
              )}
            </div>
          </fieldset>
        );
      })}
      <button ref={addButton} type="button" className={buttonClass} disabled={entries.length >= maximum} onClick={() => {
        const id = nextId.current++;
        focusId.current = id;
        onChange([...entries, { ...emptyPerson(shareholder ? "주주" : UNKNOWN), id }]);
      }}>+ {noun} 추가</button>
      {entries.length >= maximum && <p className="text-sm text-stone-600">{maximum}명까지 입력할 수 있습니다. 추가 인원이 있으면 기타 요청사항에 인원수를 알려주세요.</p>}
    </div>
  );
}

export default function IncorporationForm() {
  const [survey, setSurvey] = useState(initialSurvey);
  const [officers, setOfficers] = useState<PersonRow[]>(() => [{ ...emptyPerson(), id: 0 }]);
  const [shareholders, setShareholders] = useState<PersonRow[]>(() => [{ ...emptyPerson("주주"), id: 0 }]);
  const [review, setReview] = useState<Survey | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");
  const [website, setWebsite] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const receiptHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (review) reviewHeading.current?.focus(); }, [review]);
  useEffect(() => { if (receipt) receiptHeading.current?.focus(); }, [receipt]);

  function update<Key extends keyof Survey>(key: Key, value: Survey[Key]) {
    setSurvey(current => ({ ...current, [key]: value, ...(key === "companyType" ? { nameResult: nameResults[0] } : {}) }));
    if (key === "companyType") setCopyStatus("");
    setError("");
  }

  function updateCompany(key: keyof Survey["company"], value: string) {
    setSurvey(current => ({
      ...current,
      company: { ...current.company, [key]: value },
      ...(key === "address" || key === "companyName" ? { nameResult: nameResults[0] } : {}),
    }));
    if (key === "companyName") setCopyStatus("");
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || receipt) return;
    setError("");
    if (!review) {
      try {
        const withoutId = ({ name, role, share }: PersonRow) => ({ name, role, share });
        setReview(validateSurvey({ ...survey, officers: officers.map(withoutId), shareholders: shareholders.map(withoutId) }));
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "입력 내용을 확인해 주세요.");
      }
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/incorporation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survey: review, website }), signal: AbortSignal.timeout(25000),
      });
      const result = await response.json();
      if (!response.ok || !result.receipt) {
        setError(result.message || "접수하지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      setReceipt(result.receipt);
    } catch {
      setError("접수 결과를 확인하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-white p-7">
        <h2 ref={receiptHeading} tabIndex={-1} className="scroll-mt-44 text-2xl font-bold">기초조사서가 접수되었습니다</h2>
        <p className="mt-3">접수번호 <strong>{receipt}</strong></p>
        <p className="mt-2 text-stone-600">사무소에서 내용을 확인한 뒤 담당자에게 연락드립니다.</p>
        <a href="/" className={buttonClass + " mt-5"}>홈으로 돌아가기</a>
      </section>
    );
  }

  const canCopyName = !!survey.company.companyName.trim() && survey.company.companyName.trim() !== UNKNOWN;
  const canRecordResult = canCopyName && survey.companyType !== UNKNOWN && !!survey.company.address.trim() && survey.company.address.trim() !== UNKNOWN;
  const shareFieldsApply = survey.companyType === UNKNOWN || survey.companyType === "주식회사";

  return (
    <form onSubmit={submit} autoComplete="off" className="space-y-5">
      <div hidden={!!review} className="space-y-5">
        <nav aria-label="조사서 항목 이동" className="flex flex-wrap gap-2">
          {sections.map(([id, label]) => <a key={id} href={"#" + id} className={buttonClass}>{label}</a>)}
        </nav>
        <p className="rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          담당자 연락처는 필수입니다. 정해지지 않은 항목은 비워두거나 목록에서 ‘미정’을 선택하세요. 주민등록번호, 생년월일, 개인 주소, 계좌번호와 비밀번호는 입력하지 마세요.
        </p>
        <Section id="contact-details" title="담당자 연락처">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field required label="성함" value={survey.contactName} onChange={value => update("contactName", value)} maxLength={60} />
            <Field required label="이메일" type="email" value={survey.email} onChange={value => update("email", value)} maxLength={254} />
            <Field required label="전화번호" type="tel" value={survey.phone} onChange={value => update("phone", value)} maxLength={30} />
          </div>
        </Section>
        <Section id="company-details" title="회사 정보">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="회사 종류" value={survey.companyType} onChange={value => update("companyType", value)} options={companyTypes} />
            {companyFields.slice(0, 4).map(([key, label, placeholder]) => <Field key={key} label={label} value={survey.company[key]} placeholder={placeholder} onChange={value => updateCompany(key, value)} />)}
          </div>
          <div className="space-y-3 rounded-xl bg-stone-50 p-4">
            <h3 className="font-bold">동일상호 확인</h3>
            <p className="text-sm leading-6 text-stone-700">인터넷등기소에서 ‘열람·발급 → 법인 → 상호로 검색’을 열고, 본점 소재지 관할 등기소와 회사 종류를 선택해 검색하세요. 검색 결과는 사무소에서 검토합니다.</p>
            <div className="flex flex-wrap items-center gap-2">
              <a href="https://www.iros.go.kr/" target="_blank" rel="noreferrer" className={buttonClass}>인터넷등기소 열기 (새 창)</a>
              <button type="button" disabled={!canCopyName} className={buttonClass} onClick={async () => {
                try {
                  await navigator.clipboard.writeText(survey.company.companyName.trim());
                  setCopyStatus("국문상호를 복사했습니다.");
                } catch {
                  setCopyStatus("국문상호 입력란에서 상호를 직접 복사해 주세요.");
                }
              }}>국문상호 복사</button>
              <span role="status" className="text-sm text-stone-600">{copyStatus}</span>
            </div>
            <Select label="직접 확인한 검색 결과 (선택)" disabled={!canRecordResult} value={survey.nameResult}
              onChange={value => update("nameResult", value)} options={nameResults} />
            {!canRecordResult && <p className="text-sm text-stone-600">회사 종류, 국문상호와 본점 소재지를 입력하면 검색 결과를 기록할 수 있습니다.</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {companyFields.slice(4).filter(([key]) => shareFieldsApply || (key !== "sharePrice" && key !== "authorizedShares")).map(([key, label, placeholder]) => (
              <div key={key} className="space-y-2">
                <Field label={label} value={survey.company[key]} placeholder={placeholder} onChange={value => updateCompany(key, value)} />
                {key === "announcement" && <button type="button" className={buttonClass} onClick={() => updateCompany(key, "아시아경제신문")}>아시아경제신문 선택</button>}
                {key === "authorizedShares" && <button type="button" className={buttonClass} onClick={() => updateCompany(key, "1000000")}>1,000,000주 선택</button>}
              </div>
            ))}
          </div>
        </Section>
        <Section id="business-purposes" title="사업목적">
          <PurposePicker selected={survey.industryCodes} onChange={value => update("industryCodes", value)} />
          <label className="grid gap-2 text-sm font-semibold text-stone-700">
            직접 작성할 목적 (선택)
            <textarea className={inputClass} rows={3} maxLength={4000} value={survey.purposes} onChange={event => update("purposes", event.target.value)}
              placeholder="목록에 없는 사업 또는 구체적인 사업 내용을 한 줄씩 적어주세요." />
          </label>
          <p className="text-sm leading-6 text-stone-600">선택하거나 직접 적은 항목은 사무소에서 등기 문구로 검토합니다.</p>
        </Section>
        <Section id="officers" title="임원">
          <People entries={officers} onChange={setOfficers} />
        </Section>
        <Section id="shareholders" title="주주·사원">
          <p className="text-sm text-stone-600">지분율을 모두 확정했다면 합계가 100%가 되도록 적어주세요.</p>
          <People entries={shareholders} shareholder onChange={setShareholders} />
        </Section>
        <Section id="certificate" title="전자증명서 발급 희망사항">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="전자증명서" value={survey.certificate} onChange={value => update("certificate", value)} options={choices} />
            <Select label="기기형 OTP" value={survey.otp} onChange={value => update("otp", value)} options={choices} />
            <Field label="대표자 이메일 (선택)" type="email" value={survey.representativeEmail} onChange={value => update("representativeEmail", value)} maxLength={254} />
          </div>
        </Section>
        <Section id="notes" title="기타 요청사항">
          <label className="grid gap-2 text-sm font-semibold text-stone-700">
            사무소에 전달할 내용 (선택)
            <textarea className={inputClass} rows={4} maxLength={3000} value={survey.notes} onChange={event => update("notes", event.target.value)}
              placeholder="예: 희망 설립 일정, 사무소에 확인하고 싶은 점" />
          </label>
          <details className="rounded-lg bg-stone-50 p-4 text-sm leading-6 text-stone-700">
            <summary className="cursor-pointer font-semibold">주식회사 준비서류</summary>
            <p className="mt-2">임원 인감 관련 서류, 주주 도장, 발기인 대표 명의의 잔고증명서 등을 사무소 안내에 따라 준비해 주세요. 미성년 주주가 있다면 가족관계·기본증명서와 법정대리인 자료가 추가될 수 있습니다.</p>
          </details>
        </Section>
        <Section id="consent" title="개인정보 수집 및 이용">
          <p className="text-sm leading-6 text-stone-700">담당자 연락처와 입력하신 회사·사업목적, 임원·주주, 전자증명서 관련 정보를 법인설립 상담과 서류 준비를 위해 사무소 이메일로 전달합니다. 상담·업무 목적이 달성될 때까지 보유하며, 법령상 보존 의무가 있는 자료는 해당 기간 동안 보관합니다. 동의를 거부할 수 있으며, 거부 시 온라인 접수가 제한됩니다. <a className="font-semibold text-emerald-900 underline" href="/privacy" target="_blank" rel="noreferrer">개인정보 처리방침 (새 창)</a></p>
          <label className="flex items-start gap-2 text-sm"><input className="mt-0.5 size-4" type="checkbox" checked={survey.agree} onChange={event => update("agree", event.target.checked)} required />개인정보 수집 및 이용에 동의합니다. (필수)</label>
          <label className="flex items-start gap-2 text-sm"><input className="mt-0.5 size-4" type="checkbox" checked={survey.authority} onChange={event => update("authority", event.target.checked)} required />다른 사람의 정보를 입력한 경우 제공 권한과 동의를 확인했습니다. (필수)</label>
        </Section>
      </div>
      {review && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
          <h2 ref={reviewHeading} tabIndex={-1} className="scroll-mt-44 text-xl font-bold">전송 전 내용 확인</h2>
          <pre className="my-5 whitespace-pre-wrap [overflow-wrap:anywhere] font-sans text-sm leading-6 text-stone-700">{surveyText(review)}</pre>
          <button type="button" disabled={busy} className={buttonClass} onClick={() => {
            setReview(null);
            setError("");
            requestAnimationFrame(() => reviewButton.current?.focus());
          }}>입력 내용 수정</button>
        </section>
      )}
      <div aria-hidden="true" className="absolute left-[-10000px] size-px overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} value={website} onChange={event => setWebsite(event.target.value)} autoComplete="off" /></label>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900">{error}</p>}
      <button ref={reviewButton} type="submit" disabled={busy} className="min-h-12 w-full rounded-full bg-emerald-900 px-5 py-3 font-semibold text-white hover:bg-emerald-950 disabled:opacity-60">
        {busy ? "접수 중…" : review ? "사무소에 전송" : "작성 내용 확인"}
      </button>
    </form>
  );
}
