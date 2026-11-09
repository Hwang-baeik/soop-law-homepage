"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { companyFields, electronicFields, emptyPerson, freeSurveyText, initialSurvey, surveyText, validateFreeSurvey, validateSurvey, FREE_TEXT_MAX_LENGTH, UNKNOWN, type Person, type Survey, type SurveyMode } from "../lib/incorporation";
const secondaryClass = "inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-emerald-900 hover:bg-stone-50 disabled:opacity-50";
const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base font-normal text-stone-900 outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100 disabled:text-stone-500";
const basicCompanyKeys = new Set(["companyName", "address", "capital"]);
function Field({ label, value, onChange, placeholder, required = false, multiline = false, maxLength = 500 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; multiline?: boolean; maxLength?: number }) {
  const previous = useRef("");
  return <div className="grid content-start gap-2"><label className="grid gap-2 text-sm font-semibold text-stone-700"><span>{label}{required && <span className="text-red-700"> *</span>}</span>{multiline ? <textarea className={inputClass} rows={5} value={value === UNKNOWN ? "" : value} disabled={value === UNKNOWN} onChange={e => onChange(e.target.value)} placeholder={value === UNKNOWN ? UNKNOWN : placeholder} maxLength={maxLength} /> : <input className={inputClass} value={value === UNKNOWN ? "" : value} disabled={value === UNKNOWN} onChange={e => onChange(e.target.value)} placeholder={value === UNKNOWN ? UNKNOWN : placeholder} required={required} maxLength={maxLength} />}</label>{!required && <label className="flex w-fit items-center gap-2 text-sm text-stone-500"><input type="checkbox" checked={value === UNKNOWN} onChange={e => { if (e.target.checked) { previous.current = value; onChange(UNKNOWN); } else onChange(previous.current); }} />아직 미정</label>}</div>;
}
function Section({ number, title, description, children }: { number: string; title: string; description?: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-8"><div className="mb-6 flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-900">{number}</span><h2 className="text-xl font-bold text-stone-900">{title}</h2></div>{description && <p className="mb-6 text-sm leading-6 text-stone-500">{description}</p>}{children}</section>;
}
function People({ people, shareholder, onChange }: { people: Person[]; shareholder: boolean; onChange: (p: Person[]) => void }) {
  function update(index: number, key: keyof Person, v: string) { onChange(people.map((p, i) => i === index ? { ...p, [key]: v } : p)); }
  return <div className="space-y-5">{people.map((p, i) => <fieldset key={i} className="rounded-xl border border-stone-200 p-4 sm:p-5"><legend className="px-2 font-semibold text-emerald-900">{shareholder ? "주주" : "임원"} {i + 1}</legend><div className="grid gap-5 sm:grid-cols-2">{!shareholder && <label className="grid gap-2 text-sm font-semibold text-stone-700">직위<select className={inputClass} value={p.role} onChange={e => update(i, "role", e.target.value)}>{["미정", "대표이사 겸 사내이사", "사내이사", "감사", "기타"].map(role => <option key={role}>{role}</option>)}</select></label>}<Field label="성명" value={p.name} onChange={v => update(i, "name", v)} maxLength={60} /><Field label="생년월일" placeholder="YYYY-MM-DD (주민등록번호 입력 금지)" value={p.birthDate} onChange={v => update(i, "birthDate", v)} maxLength={10} /><Field label="주소" placeholder="도로명주소와 동·호수" value={p.address} onChange={v => update(i, "address", v)} />{shareholder && <Field label="지분율 (%)" placeholder="예: 60 / 확정된 경우 합계 100%" value={p.share} onChange={v => update(i, "share", v)} maxLength={10} />}</div>{people.length > 1 && <button type="button" onClick={() => onChange(people.filter((_, index) => i !== index))} className="mt-4 text-sm text-stone-600 underline">{shareholder ? "주주" : "임원"} {i + 1} 삭제</button>}</fieldset>)}<button type="button" className={secondaryClass} disabled={people.length >= (shareholder ? 20 : 10)} onClick={() => onChange([...people, emptyPerson(shareholder ? "주주" : "미정")])}>+ {shareholder ? "주주" : "임원"} 추가</button><p className="text-xs text-stone-500">{shareholder ? "주주 20명" : "임원 10명"}까지 입력 가능합니다. 더 많은 경우 기타 요청사항에 알려주세요.</p></div>;
}
export default function IncorporationForm() {
  const [survey, setSurvey] = useState<Survey>(initialSurvey);
  const [mode, setMode] = useState<SurveyMode>("free");
  const [freeText, setFreeText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [sent, setSent] = useState(false);
  const [message, setMessage] = useState(""), [website, setWebsite] = useState("");
  const submission = useRef<{ serialized: string; id: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (preview) { resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); resultRef.current?.focus({ preventScroll: true }); } }, [preview]);
  function update<K extends keyof Survey>(key: K, value: Survey[K]) { setSurvey(p => ({ ...p, [key]: value })); setMessage(""); }
  function changeMode(nextMode: SurveyMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setSurvey(current => ({ ...current, agree: false, authority: false }));
    setMessage("");
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy || sent) return;
    setMessage("");
    let validated: Survey | ReturnType<typeof validateFreeSurvey>;
    try {
      const { contactName, email, phone, agree } = survey;
      validated = mode === "free"
        ? validateFreeSurvey({ contactName, email, phone, agree, freeText })
        : validateSurvey(survey);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "입력 내용을 확인해 주세요.");
      return;
    }
    if (!preview) {
      setPreview("freeText" in validated ? freeSurveyText(validated) : surveyText(validated));
      return;
    }
    if (!validated.agree) {
      setMessage("개인정보 수집 및 이용에 동의해 주세요.");
      return;
    }
    const payload = { mode, survey: validated };
    const serialized = JSON.stringify(payload);
    if (!submission.current || submission.current.serialized !== serialized) submission.current = { serialized, id: crypto.randomUUID() };
    setBusy(true);
    try {
      const response = await fetch("/api/incorporation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, website, requestId: submission.current.id }), signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "접수하지 못했습니다. 다시 시도해 주세요.");
      setSent(true); setMessage(`${result.message} 접수번호: ${result.receipt}`);
    } catch (error) { setMessage(error instanceof Error && error.name !== "TimeoutError" ? error.message : "접수 결과를 확인하지 못했습니다. 입력 내용을 유지한 채 다시 시도하거나 사무소에 연락해 주세요."); }
    finally { setBusy(false); }
  }
  if (sent) return <div className="rounded-2xl border border-emerald-200 bg-white p-8" role="status"><p className="text-sm font-semibold text-emerald-800">전송 완료</p><h2 className="mt-3 text-2xl font-bold">기초조사서가 접수되었습니다.</h2><p className="mt-4 break-words leading-7 text-stone-600">{message}</p><a href="/" className={secondaryClass + " mt-6"}>홈으로 돌아가기</a></div>;
  return <form onSubmit={submit} className="space-y-6" autoComplete="off">
    <div className="rounded-2xl bg-emerald-950 p-6 text-white">
      <p className="font-semibold">정해진 내용부터 편하게 적어주세요.</p>
      <p className="mt-2 text-sm leading-7 text-emerald-50">자유롭게 설명하거나 항목별로 작성할 수 있습니다. 담당자 연락처는 꼭 입력해 주세요.</p>
      <p className="mt-2 text-xs leading-6 text-emerald-100">페이지를 닫거나 새로고침하면 입력 내용이 사라집니다.</p>
    </div>
    <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
    {!preview ? <>
      <Section number="01" title="담당자 연락처" description="조사서 확인과 추가 안내를 위한 연락처입니다. 이 세 항목은 미정으로 접수할 수 없습니다."><div className="grid gap-5 sm:grid-cols-3"><Field required label="담당자 성함" value={survey.contactName} onChange={v => update("contactName", v)} maxLength={60} /><Field required label="이메일" value={survey.email} onChange={v => update("email", v)} maxLength={254} /><Field required label="연락처" value={survey.phone} onChange={v => update("phone", v)} maxLength={30} /></div></Section>
      <div role="group" aria-label="작성 방식" className="flex flex-wrap gap-2">
        <button type="button" className={secondaryClass + " aria-pressed:border-emerald-800 aria-pressed:bg-emerald-100"} aria-pressed={mode === "free"} onClick={() => changeMode("free")}>자유롭게 작성하기</button>
        <button type="button" className={secondaryClass + " aria-pressed:border-emerald-800 aria-pressed:bg-emerald-100"} aria-pressed={mode === "structured"} onClick={() => changeMode("structured")}>항목별로 작성하기</button>
      </div>
      {mode === "free" ? (
        <Section number="02" title="설립 계획" description="회사 이름, 하려는 사업, 자본금 등 정해진 내용을 편하게 적어주세요. 궁금한 점도 함께 적을 수 있습니다.">
          <label htmlFor="incorporation-free-text" className="text-sm font-semibold text-stone-700">자유 작성 내용 <span className="font-normal text-stone-500">(선택)</span></label>
          <textarea
            id="incorporation-free-text"
            aria-describedby="incorporation-free-help"
            className={inputClass + " mt-2"}
            rows={8}
            maxLength={FREE_TEXT_MAX_LENGTH}
            placeholder="예: 온라인 쇼핑몰을 운영할 예정입니다. 상호는 주식회사 새봄, 자본금은 500만 원으로 생각하고 있습니다. 본점 주소와 임원은 아직 미정입니다."
            value={freeText}
            onChange={event => { setFreeText(event.target.value); setMessage(""); }}
          />
          <p id="incorporation-free-help" className="mt-2 text-sm leading-6 text-stone-600">정해진 내용이 없으면 비워두셔도 됩니다. 주민등록번호 전체와 비밀번호는 입력하지 마세요. 필요한 정보는 사무소에서 별도로 확인합니다.</p>
        </Section>
      ) : <>
      <Section number="02" title="정해진 회사 정보" description="확정된 항목만 입력해 주세요. 빈칸은 미정으로 전달됩니다.">
        <div className="grid gap-5 sm:grid-cols-2">
          {companyFields.filter(([key]) => basicCompanyKeys.has(key)).map(([key, label, placeholder]) => (
            <Field key={key} label={label} value={survey.company[key]} placeholder={placeholder} onChange={value => update("company", { ...survey.company, [key]: value })} />
          ))}
        </div>
      </Section>
      <Section number="03" title="사업목적" description="예정하신 사업을 한 줄에 하나씩 적어주세요. 구체적인 등기 문구는 사무소에서 검토합니다."><Field label="사업목적" multiline maxLength={6000} placeholder={"1. 소프트웨어 개발 및 공급업\n2. 전자상거래업"} value={survey.purposes} onChange={v => update("purposes", v)} /><p className="mt-3 text-sm text-stone-500">‘위 각호에 부대하는 사업 일체’는 함께 전달됩니다.</p></Section>
      <details className="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-8">
        <summary className="cursor-pointer font-semibold text-emerald-900">상세 정보 더 입력하기</summary>
        <div className="grid gap-5 sm:grid-cols-2">
          {companyFields.filter(([key]) => !basicCompanyKeys.has(key)).map(([key, label, placeholder]) => (
            <div key={key}>
              <Field label={label} value={survey.company[key]} placeholder={placeholder} onChange={value => update("company", { ...survey.company, [key]: value })} />
              {(key === "announcement" || key === "authorizedShares") && (
                <button type="button" className="mt-2 text-sm font-semibold text-emerald-900 underline" onClick={() => update("company", { ...survey.company, [key]: key === "announcement" ? "아시아경제신문" : "1000000" })}>
                  기본값 사용: {key === "announcement" ? "아시아경제신문" : "1,000,000주"}
                </button>
              )}
            </div>
          ))}
        </div>
      <Section number="04" title="임원" description="대표이사, 사내이사, 감사 정보를 입력해주세요. 임원 구성과 주식 보유 여부는 사무소에서 함께 확인합니다."><People people={survey.officers} shareholder={false} onChange={v => update("officers", v)} /></Section>
      <Section number="05" title="주주" description="확정된 지분율을 모두 입력하는 경우 합계가 100%인지 확인해주세요. 미확정 지분율은 미정으로 표시할 수 있습니다."><People people={survey.shareholders} shareholder onChange={v => update("shareholders", v)} /></Section>
      <Section number="06" title="전자증명서 발급 희망사항" description="발급 희망 여부를 알려주세요. 등기소·전자증명서 비밀번호는 별도로 확인합니다."><div className="grid gap-6 sm:grid-cols-2">{electronicFields.map(([key, label, options]) => <label key={key} className="grid gap-2 text-sm font-semibold text-stone-700">{label}<select className={inputClass} value={survey[key]} onChange={e => update(key, e.target.value)}>{options.map(v => <option key={v}>{v}</option>)}</select></label>)}<Field label="대표자 이메일" value={survey.representativeEmail} onChange={v => update("representativeEmail", v)} maxLength={254} /><Field label="등기소 희망 아이디" placeholder="희망 아이디가 있다면 기재 (비밀번호 제외)" value={survey.registryId} onChange={v => update("registryId", v)} maxLength={60} /></div></Section>
      <Section number="07" title="기타 요청사항"><Field label="전달할 내용" multiline maxLength={3000} value={survey.notes} onChange={v => update("notes", v)} placeholder="예정 일정, 추가 확인이 필요한 사항 등" /></Section>
      </details>
      </>}
    </> : <section ref={resultRef} tabIndex={-1} className="scroll-mt-32 rounded-2xl border border-stone-200 bg-white p-5 sm:p-8"><h2 className="text-xl font-bold">전송 전 내용 확인</h2><p className="mt-2 text-sm text-stone-500">아래 내용을 확인한 후 사무소로 보내주세요.</p><pre className="mt-6 whitespace-pre-wrap break-words font-sans text-sm leading-7 text-stone-700">{preview}</pre><button type="button" className={secondaryClass + " mt-6"} onClick={() => { setPreview(null); setMessage(""); }}>입력 내용 수정</button></section>}
    {mode === "free" && preview && (
      <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-8">
        <h2 className="font-bold">개인정보 수집 및 이용 안내</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          담당자 성함·이메일·연락처와 자유 작성 내용은 법인설립 상담과 설립서류 작성 준비를 위해 사무소 이메일로 전달됩니다. 상담·업무 목적 달성 시까지 보유하며 보존 의무가 있는 자료는 해당 기간 동안 보관합니다. 동의를 거부할 수 있으나 온라인 접수가 제한됩니다. <a className="font-semibold text-emerald-900 underline" href="/privacy" target="_blank" rel="noreferrer">개인정보 처리방침 (새 창)</a>
        </p>
        <label className="mt-5 flex items-start gap-3 text-sm text-stone-700">
          <input type="checkbox" className="mt-1" checked={survey.agree} onChange={event => update("agree", event.target.checked)} required />
          개인정보 수집 및 이용에 동의하며, 다른 사람의 정보를 작성한 경우 제공 권한과 동의를 확인했습니다. (필수)
        </label>
      </section>
    )}
    {mode === "structured" && (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-8"><h2 className="font-bold">개인정보 수집 및 이용 안내</h2><p className="mt-3 text-sm leading-7 text-stone-600">수집·이용 목적: 법인설립 상담, 설립서류 작성 준비 및 연락. 항목: 담당자 성함·이메일·연락처, 입력한 회사정보와 임원·주주의 성명·생년월일·주소·지분율, 전자증명서 희망사항. 입력 내용은 사무소 이메일(soop@sooplaw.com)로 전달되며 상담·업무 목적 달성 시까지 보유합니다. 보존 의무가 있는 자료는 해당 기간 동안 보관합니다. 동의를 거부할 수 있으나 온라인 접수가 제한됩니다. 임원·주주 등 다른 분의 정보는 제공 권한을 확인한 뒤 입력해주세요. 문의: 02-6956-8683.</p><div className="mt-5 grid gap-4 text-sm text-stone-700"><label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={survey.agree} onChange={e => update("agree", e.target.checked)} required />개인정보 수집 및 이용에 동의합니다. (필수)</label><label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={survey.authority} onChange={e => update("authority", e.target.checked)} required />임원·주주 등 기재된 분들의 정보를 제공할 권한과 동의를 확인했습니다. (필수)</label></div></section>
    )}
    </fieldset>
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden"><label>Website<input name="website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></label></div>
    {preview && <p className="text-sm leading-6 text-stone-500">안전한 접수를 위해 자동입력 방지 확인이 적용됩니다.</p>}
    <div role="alert" aria-live="polite" className={message ? "rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900" : ""}>{message}</div>
    <button type="submit" disabled={busy} className="w-full rounded-full bg-emerald-900 px-6 py-4 font-semibold text-white hover:bg-emerald-950 disabled:cursor-not-allowed disabled:bg-stone-300">{busy ? "접수 중…" : preview ? "확인한 내용으로 사무소에 전송" : "작성 내용 확인하기"}</button>
    <details className="rounded-2xl border border-stone-200 bg-white p-5 text-sm leading-7 text-stone-600"><summary className="cursor-pointer font-semibold text-stone-800">서류 준비 안내</summary><p className="mt-3">원본 양식의 준비서류: 임원의 개인인감도장·인감증명서·주민등록초본 또는 등본, 주주의 도장, 발기인대표 명의 통장잔고증명서. 미성년 주주가 있으면 가족관계·기본증명서와 법정대리인 관련 자료가 추가될 수 있습니다. 구체적인 발급 방식과 필요한 부수는 사무소 안내를 받은 후 준비해주세요. 이 화면에는 증명서나 주민등록번호 전체를 업로드하지 않습니다.</p></details>
  </form>;
}
