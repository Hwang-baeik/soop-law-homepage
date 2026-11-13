"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  choices, companyFields, companyTypePositions, companyTypes, defaultBankCertificateHolder, emptyPerson, formatCompanyName, initialSurvey,
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

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void; options: readonly string[];
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-700">
      {label}
      <select className={inputClass} value={value} onChange={event => onChange(event.target.value)}>
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

function Caution({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border-l-4 border-yellow-300 bg-red-950 px-4 py-3 text-yellow-100">
      <p className="font-bold text-yellow-300">주의사항</p>
      <p className="mt-1 text-base font-semibold leading-7">{children}</p>
    </div>
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
        const update = (changes: Partial<Person>) => onChange(entries.map(entry => entry.id === person.id ? { ...entry, ...changes } : entry));
        const rowLabel = `${noun} ${index + 1}`;
        return (
          <fieldset key={person.id} ref={index === entries.length - 1 ? lastRow : undefined} className="rounded-xl border border-stone-200 p-3 sm:p-4">
            <legend className="px-2 text-sm font-bold text-emerald-900">{rowLabel}</legend>
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label={shareholder ? "성명 또는 법인명" : "성명"} value={person.name} onChange={value => update({ name: value })} maxLength={60} />
              {shareholder
                ? <Field label="지분율 (%)" placeholder="예: 60 또는 미정" value={person.share} onChange={value => update({ share: value })} maxLength={10} />
                : <Select label="직위" value={person.role} onChange={value => update({ role: value })} options={roles} />}
              {entries.length > 1 && (
                <button type="button" className={buttonClass + " justify-self-start"} aria-label={rowLabel + " 삭제"} onClick={() => {
                  onChange(entries.filter(entry => entry.id !== person.id));
                  addButton.current?.focus();
                }}>삭제</button>
              )}
            </div>
            {shareholder && (
              <div className="mt-3 space-y-2">
                <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-stone-700">
                  <input type="checkbox" className="size-4 accent-emerald-900" checked={!!person.minor}
                    onChange={event => update(event.target.checked ? { minor: true } : { minor: false, fatherName: "", motherName: "" })} />
                  미성년자
                </label>
                {person.minor && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="법정대리인 부 성명" value={person.fatherName ?? ""} onChange={value => update({ fatherName: value })} maxLength={60} />
                    <Field label="법정대리인 모 성명" value={person.motherName ?? ""} onChange={value => update({ motherName: value })} maxLength={60} />
                  </div>
                )}
              </div>
            )}
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

function PreparationChecklist({ survey }: { survey: Survey }) {
  const named = (person: Person) => person.name && person.name !== UNKNOWN;
  const officers = survey.officers.filter(named);
  const shareholders = survey.shareholders.filter(named);
  const minors = survey.shareholders.filter(person => person.minor);
  const holder = survey.company.bankCertificateHolder;
  const officerDocuments = "개인인감도장, 개인인감증명서 1부(인터넷 발급 제외), 주민등록초본 1부(주민등록번호 뒷자리 공개)";
  const minorDocuments = "미성년자 본인 기준 기본증명서(상세), 가족관계증명서(상세) 및 법정대리인의 도장";

  return (
    <section className="mt-6 space-y-3 rounded-xl bg-stone-50 p-4 text-sm leading-7 text-stone-700 sm:p-5">
      <h3 className="text-lg font-bold text-stone-950">최종 필요서류</h3>
      <p>아래 서류와 도장을 준비해 주세요. 주민등록초본은 사무소 안내에 따라 별도로 제출해 주세요.</p>
      <ul className="list-disc space-y-2 pl-5 [overflow-wrap:anywhere]">
        {officers.length ? officers.map((person, index) => (
          <li key={index}><strong>{person.name} (임원)</strong> · {officerDocuments}</li>
        )) : <li><strong>임원 각 1인</strong> · {officerDocuments}</li>}
        {shareholders.length ? shareholders.map((person, index) => (
          <li key={index}><strong>{person.name} (주주·사원)</strong> · 도장</li>
        )) : <li><strong>주주·사원 각 1인</strong> · 도장</li>}
        <li><strong>주주 중 1인의 잔고증명서</strong> · {holder ? `발급인 ${holder}` : `${defaultBankCertificateHolder} 명의로 지정 예정`}</li>
        {minors.map((person, index) => {
          const guardians = [person.fatherName, person.motherName].filter(name => name && name !== UNKNOWN);
          return (
            <li key={index}>
              <strong>{named(person) ? `${person.name} (미성년 주주)` : "미성년 주주"}</strong> · {minorDocuments}
              {guardians.length > 0 && ` (${guardians.join(", ")})`}
            </li>
          );
        })}
      </ul>
    </section>
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
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const receiptHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (review) reviewHeading.current?.focus(); }, [review]);
  useEffect(() => { if (receipt) receiptHeading.current?.focus(); }, [receipt]);

  function update<Key extends keyof Survey>(key: Key, value: Survey[Key]) {
    setSurvey(current => ({ ...current, [key]: value }));
    setError("");
  }

  function updateCompany(key: keyof Survey["company"], value: string) {
    setSurvey(current => ({
      ...current,
      company: { ...current.company, [key]: value },
    }));
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || receipt) return;
    setError("");
    if (!review) {
      try {
        setReview(validateSurvey({ ...survey, officers, shareholders }));
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
        {review && <PreparationChecklist survey={review} />}
        <a href="/" className={buttonClass + " mt-5"}>홈으로 돌아가기</a>
      </section>
    );
  }

  const companyName = formatCompanyName(survey.company.companyName, survey.companyType, survey.companyTypePosition);
  const alternateName = formatCompanyName(survey.company.alternateName, survey.companyType, survey.companyTypePosition);
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
          <Caution>동일한 관할 내 같은 상호가 있는 경우 상호를 변경해야 할 가능성도 있습니다.</Caution>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="회사 종류" value={survey.companyType} onChange={value => update("companyType", value)} options={companyTypes} />
            <Select label="회사 종류 표기 위치" value={survey.companyTypePosition} onChange={value => update("companyTypePosition", value)}
              options={companyTypePositions} />
            {companyFields.slice(0, 4).map(([key, label, placeholder]) => <Field key={key} label={label} value={survey.company[key]} placeholder={placeholder} onChange={value => updateCompany(key, value)} />)}
          </div>
          <div className="space-y-1 rounded-xl bg-stone-50 p-4 text-sm text-stone-700 [overflow-wrap:anywhere]">
            <p>국문상호에는 회사 종류를 뺀 이름만 입력하세요. 예를 들어 ‘새봄’을 입력하면 ‘주식회사 새봄’ 또는 ‘새봄 주식회사’로 표시됩니다.</p>
            <p>국문상호 1순위 <strong>{companyName}</strong></p>
            {alternateName !== UNKNOWN && <p>국문상호 2순위 <strong>{alternateName}</strong></p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {companyFields.slice(4).filter(([key]) => shareFieldsApply || (key !== "sharePrice" && key !== "authorizedShares")).map(([key, label, placeholder]) => (
              <div key={key} className="space-y-2">
                <Field label={label} value={survey.company[key]} placeholder={placeholder} onChange={value => updateCompany(key, value)}
                  maxLength={key === "bankCertificateHolder" ? 60 : 300} />
                {key === "announcement" && <button type="button" className={buttonClass} onClick={() => updateCompany(key, "아시아경제신문")}>아시아경제신문 선택</button>}
                {key === "authorizedShares" && <button type="button" className={buttonClass} onClick={() => updateCompany(key, "1000000")}>1,000,000주 선택</button>}
                {key === "bank" && <button type="button" className={buttonClass} onClick={() => updateCompany(key, UNKNOWN)}>미정</button>}
                {key === "bankCertificateHolder" && <p className="text-sm leading-6 text-stone-600">비워두면 {defaultBankCertificateHolder} 명의로 지정됩니다.</p>}
              </div>
            ))}
          </div>
        </Section>
        <Section id="business-purposes" title="사업목적">
          <Caution>사업목적 중에는 최소 자본금 제한 등 인허가 요건이 필요한 경우가 있습니다.</Caution>
          <PurposePicker selected={survey.industryCodes} onChange={value => update("industryCodes", value)} />
          <label className="grid gap-2 text-sm font-semibold text-stone-700">
            직접 작성할 목적 (선택)
            <textarea className={inputClass} rows={3} maxLength={4000} value={survey.purposes} onChange={event => update("purposes", event.target.value)}
              placeholder="목록에 없는 사업 또는 구체적인 사업 내용을 한 줄씩 적어주세요." />
          </label>
          <p className="text-sm leading-6 text-stone-600">선택하거나 직접 적은 항목은 사무소에서 등기 문구로 검토합니다.</p>
        </Section>
        <Section id="officers" title="임원">
          {shareFieldsApply && <Caution>주식회사 발기설립 안내 · 주주가 아닌 임원이 1인 이상 필요합니다.</Caution>}
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
        </Section>
        <Section id="consent" title="개인정보 수집 및 이용">
          <p className="text-sm leading-6 text-stone-700">담당자 연락처와 입력하신 회사·사업목적, 잔고증명서 발급인 성명, 임원·주주 정보, 미성년 여부와 법정대리인 성명, 전자증명서 관련 정보를 법인설립 상담과 서류 준비를 위해 사무소 이메일로 전달합니다. 상담·업무 목적이 달성될 때까지 보유하며, 법령상 보존 의무가 있는 자료는 해당 기간 동안 보관합니다. 동의를 거부할 수 있으며, 거부 시 온라인 접수가 제한됩니다. <a className="font-semibold text-emerald-900 underline" href="/privacy" target="_blank" rel="noreferrer">개인정보 처리방침 (새 창)</a></p>
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
