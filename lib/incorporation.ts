export const UNKNOWN = "미정";
export const FREE_TEXT_MAX_LENGTH = 6000;
export const companyFields = [
  ["companyName", "상호 1순위", "예: 주식회사 숲 / 숲 주식회사"],
  ["alternateName", "상호 2순위", "중복 상호에 대비한 후보"],
  ["address", "본점 소재지", "도로명주소와 동·호수"],
  ["announcement", "공고방법", "신문명 또는 홈페이지 주소 / 기본값 사용: 아시아경제신문"],
  ["sharePrice", "1주의 금액 (원)", "예: 500 또는 5000"],
  ["authorizedShares", "최대 발행할 주식의 총수 (주)", "기본값 사용 시 1000000"],
  ["capital", "자본금 (원)", "숫자로 입력"],
  ["bank", "잔고증명서 발행은행·지점", "은행명과 지점명"],
] as const;
export const electronicFields = [
  ["certificate", "전자증명서 발급 희망", ["미정", "희망", "희망하지 않음"]],
  ["otp", "기기형 OTP 발급 희망", ["미정", "희망", "희망하지 않음"]],
] as const;
export type Person = { role: string; name: string; birthDate: string; address: string; share: string };
type Contact = { contactName: string; email: string; phone: string };
export type Survey = Contact & { company: Record<string, string>; purposes: string; officers: Person[]; shareholders: Person[]; certificate: string; otp: string; representativeEmail: string; registryId: string; notes: string; agree: boolean; authority: boolean };
export type SurveyMode = "free" | "structured";
export const emptyPerson = (role = "미정"): Person => ({ role, name: "", birthDate: "", address: "", share: "" });
export function initialSurvey(): Survey {
  return { contactName: "", email: "", phone: "", company: Object.fromEntries(companyFields.map(([key]) => [key, ""])), purposes: "", officers: [emptyPerson("대표이사 겸 사내이사")], shareholders: [emptyPerson("주주")], certificate: UNKNOWN, otp: UNKNOWN, representativeEmail: "", registryId: "", notes: "", agree: false, authority: false };
}
const readText = (v: unknown, max: number): string => {
  if (typeof v !== "string" || v.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) throw new Error("입력 형식이나 길이를 확인해 주세요.");
  return v;
};
const normalized = (v: unknown, max = 500) => readText(v, max).trim() || UNKNOWN;
export const validEmail = (v: string) => v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && !/[\r\n]/.test(v);

function surveyRecord(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("입력 내용을 확인해 주세요.");
  return input as Record<string, unknown>;
}

function validateContact(b: Record<string, unknown>): Contact {
  const contactName = normalized(b.contactName, 60), email = normalized(b.email, 254), phone = normalized(b.phone, 30);
  if (contactName === UNKNOWN || !validEmail(email) || !/^0\d{8,10}$/.test(phone.replace(/[\s()-]/g, ""))) throw new Error("담당자 성함, 이메일, 연락처를 확인해 주세요.");
  return { contactName, email, phone };
}

function rejectResidentNumber(text: string) {
  if (/\d{6}[ -]?[1-8]\d{6}/.test(text)) throw new Error("주민등록번호 전체는 입력하지 마세요. 생년월일만 기재해 주세요.");
}

export function validateSurvey(input: unknown): Survey {
  const b = surveyRecord(input);
  if (b.agree !== true || b.authority !== true) throw new Error("개인정보 동의와 정보 제공 권한 확인이 필요합니다.");
  const { contactName, email, phone } = validateContact(b);
  if (!b.company || typeof b.company !== "object" || Array.isArray(b.company)) throw new Error("회사 기본정보를 확인해 주세요.");
  const company = Object.fromEntries(companyFields.map(([k]) => [k, normalized((b.company as Record<string, unknown>)[k])]));
  for (const key of ["sharePrice", "authorizedShares", "capital"]) if (company[key] !== UNKNOWN && !/^[1-9]\d{0,14}$/.test(company[key])) throw new Error("금액과 주식 수는 0보다 큰 정수 또는 미정으로 입력해 주세요.");
  const people = (value: unknown, max: number, shareholder: boolean): Person[] => {
    if (!Array.isArray(value) || value.length < 1 || value.length > max) throw new Error("임원·주주 인원 수를 확인해 주세요.");
    return value.map(p => {
      if (!p || typeof p !== "object" || Array.isArray(p)) throw new Error("임원·주주 정보를 확인해 주세요.");
      const person = Object.fromEntries(["role", "name", "birthDate", "address", "share"].map(k => [k, normalized(p[k], k === "address" ? 500 : 60)])) as Person;
      if (!shareholder && ![UNKNOWN, "대표이사 겸 사내이사", "사내이사", "감사", "기타"].includes(person.role)) throw new Error("임원 직위를 확인해 주세요.");
      if (person.birthDate !== UNKNOWN) {
        const d = new Date(person.birthDate + "T00:00:00Z");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(person.birthDate) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== person.birthDate || d.getTime() > Date.now()) throw new Error("생년월일은 YYYY-MM-DD 또는 미정으로 입력해 주세요.");
      }
      if (shareholder && person.share !== UNKNOWN && (!/^\d{1,3}(\.\d{1,4})?$/.test(person.share) || Number(person.share) > 100)) throw new Error("지분율은 0~100 사이의 숫자 또는 미정으로 입력해 주세요.");
      return person;
    });
  };
  const officers = people(b.officers, 10, false), shareholders = people(b.shareholders, 20, true);
  if (shareholders.every(p => p.share !== UNKNOWN) && Math.abs(shareholders.reduce((sum, p) => sum + Number(p.share), 0) - 100) > 0.0001) throw new Error("확정된 주주 지분율의 합계는 100%가 되어야 합니다. 미확정 지분은 미정으로 표시해 주세요.");
  const certificate = normalized(b.certificate, 20), otp = normalized(b.otp, 20);
  if (![UNKNOWN, "희망", "희망하지 않음"].includes(certificate) || ![UNKNOWN, "희망", "희망하지 않음"].includes(otp)) throw new Error("발급 희망사항을 확인해 주세요.");
  const representativeEmail = normalized(b.representativeEmail, 254), registryId = normalized(b.registryId, 60);
  if (representativeEmail !== UNKNOWN && !validEmail(representativeEmail)) throw new Error("대표자 이메일을 확인해 주세요.");
  const survey = { contactName, email, phone, company, officers, shareholders, purposes: normalized(b.purposes, 6000), certificate, otp, representativeEmail, registryId, notes: normalized(b.notes, 3000), agree: true, authority: true };
  const freeText = [contactName, company.companyName, company.alternateName, company.address, company.announcement, company.bank, survey.purposes, survey.notes, ...officers.flatMap(p => [p.name, p.address]), ...shareholders.flatMap(p => [p.name, p.address])].join("\n");
  rejectResidentNumber(freeText);
  return survey;
}

export function validateFreeSurvey(input: unknown) {
  const body = surveyRecord(input);
  const contact = validateContact(body);
  const freeText = readText(body.freeText, FREE_TEXT_MAX_LENGTH);
  rejectResidentNumber(contact.contactName);
  rejectResidentNumber(freeText);
  return { ...contact, freeText, agree: body.agree === true };
}

export function freeSurveyText(survey: ReturnType<typeof validateFreeSurvey>) {
  return [
    "주식회사 설립등기 기초조사서 (자유 작성)",
    `【담당자】\n성함: ${survey.contactName}\n이메일: ${survey.email}\n연락처: ${survey.phone}`,
    `【자유 작성 내용】\n${survey.freeText.trim() ? survey.freeText : UNKNOWN}`,
  ].join("\n\n");
}

export function prepareSurveyMail(input: unknown, mode: unknown = "structured") {
  if (mode === "free") {
    const survey = validateFreeSurvey(input);
    if (!survey.agree) throw new Error("개인정보 수집·이용 동의와 정보 제공 권한 확인이 필요합니다.");
    const text = [
      freeSurveyText(survey),
      "개인정보 수집·이용 동의: 동의함",
      "다른 사람의 정보를 작성한 경우 정보 제공 권한 및 동의 확인: 확인함",
      "동의 안내 버전: incorporation-free-v1",
    ].join("\n\n");
    return { contactName: survey.contactName, email: survey.email, text };
  }
  if (mode !== "structured") throw new Error("작성 방식을 확인해 주세요.");
  const survey = validateSurvey(input);
  return { contactName: survey.contactName, email: survey.email, text: surveyText(survey) };
}

export function surveyText(s: Survey): string {
  const personLines = (p: Person, i: number, shareholder: boolean) => `${i + 1}. ${shareholder ? "주주" : p.role}\n성명: ${p.name || UNKNOWN}\n생년월일: ${p.birthDate || UNKNOWN}\n주소: ${p.address || UNKNOWN}${shareholder ? `\n지분율: ${p.share || UNKNOWN}${p.share && p.share !== UNKNOWN ? "%" : ""}` : ""}`;
  return ["주식회사 설립등기 기초조사서", "【담당자】", `성함: ${s.contactName}\n이메일: ${s.email}\n연락처: ${s.phone}`, "【회사 기본정보】", ...companyFields.map(([k, label]) => `${label}: ${s.company[k] || UNKNOWN}`), "【사업목적】", s.purposes || UNKNOWN, "위 각호에 부대하는 사업 일체", "【임원】", ...s.officers.map((p, i) => personLines(p, i, false)), "【주주】", ...s.shareholders.map((p, i) => personLines(p, i, true)), "【전자증명서】", `발급 희망: ${s.certificate}\n대표자 이메일: ${s.representativeEmail || UNKNOWN}\n등기소 희망 아이디: ${s.registryId || UNKNOWN}\n기기형 OTP: ${s.otp}\n주민등록번호 전체 및 비밀번호: 별도 확인`, "【기타 요청사항】", s.notes || UNKNOWN, "개인정보 수집·이용 동의: 동의함\n임원·주주 정보 제공 권한 확인: 확인함\n동의 안내 버전: incorporation-v1"].join("\n\n");
}
