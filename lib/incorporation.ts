import { industryNames, maximumIndustrySelections } from "./ksic";

export const UNKNOWN = "미정";
export const companyTypes = [UNKNOWN, "주식회사", "유한회사", "유한책임회사", "합명회사", "합자회사"] as const;
export const companyTypePositions = ["상호 앞", "상호 뒤"] as const;
export const roles = [UNKNOWN, "대표이사 겸 사내이사", "대표이사", "사내이사", "이사", "감사", "업무집행자", "기타"] as const;
export const choices = [UNKNOWN, "희망", "희망하지 않음"] as const;
export const companyFields = [
  ["companyName", "국문상호 (1순위)", "예: 새봄"],
  ["englishName", "영문상호 (선택)", "예: Saebom"],
  ["alternateName", "국문상호 (2순위, 선택)", "예: 새봄파트너스"],
  ["address", "본점 소재지", "도로명주소와 동·호수"],
  ["announcement", "공고방법", "신문명 또는 홈페이지 주소"],
  ["sharePrice", "1주의 금액 (원)", "예: 5000"],
  ["authorizedShares", "발행할 주식의 총수 (주)", "예: 1000000"],
  ["capital", "자본금 (원)", "예: 5000000"],
  ["bank", "잔고증명서 발행은행·지점", "예: OO은행 성수지점"],
] as const;
type CompanyKey = (typeof companyFields)[number][0];
export type Person = { role: string; name: string; share: string };
export type Survey = {
  contactName: string; email: string; phone: string;
  company: Record<CompanyKey, string>;
  companyType: string; companyTypePosition: string;
  industryCodes: string[]; purposes: string;
  officers: Person[]; shareholders: Person[];
  certificate: string; otp: string; representativeEmail: string;
  notes: string; agree: boolean; authority: boolean;
};

export const emptyPerson = (role: string = UNKNOWN): Person => ({ role, name: "", share: "" });

export function initialSurvey(): Survey {
  return {
    contactName: "", email: "", phone: "",
    company: Object.fromEntries(companyFields.map(([key]) => [key, ""])) as Survey["company"],
    companyType: UNKNOWN, companyTypePosition: companyTypePositions[0], industryCodes: [], purposes: "",
    officers: [emptyPerson()], shareholders: [emptyPerson("주주")],
    certificate: UNKNOWN, otp: UNKNOWN, representativeEmail: "",
    notes: "", agree: false, authority: false,
  };
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("입력 내용을 확인해 주세요.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number, multiline = false) {
  if (typeof value !== "string" || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)
      || (!multiline && /[\r\n\t\u2028\u2029]/.test(value))) {
    throw new Error("입력 형식이나 길이를 확인해 주세요.");
  }
  const normalized = value.normalize("NFKC").replace(/[\u200b-\u200d\ufeff]/g, "");
  if (/\d{6}[\s.\-‐‑–—]*[1-8]\d{6}/.test(normalized)
      || /(?:비밀번호|password|계좌번호|여권번호|운전면허번호)\s*[:=]\s*\S/i.test(normalized)) {
    throw new Error("주민등록번호, 계좌번호, 비밀번호 등 민감한 정보는 입력하지 마세요.");
  }
  return value.trim();
}

function choice(value: unknown, options: readonly string[]) {
  if (typeof value !== "string" || !options.includes(value)) throw new Error("선택 항목을 확인해 주세요.");
  return value;
}

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function people(value: unknown, shareholder: boolean) {
  const maximum = shareholder ? 20 : 10;
  if (!Array.isArray(value) || value.length < 1 || value.length > maximum) {
    throw new Error("임원·주주(사원) 인원 수를 확인해 주세요.");
  }
  return value.map(entry => {
    const person = record(entry);
    const name = text(person.name, 60);
    const role = shareholder ? "주주·사원" : choice(person.role, roles);
    const share = shareholder ? text(person.share, 10) : "";
    if (share && share !== UNKNOWN && (!/^\d{1,3}(\.\d{1,4})?$/.test(share) || Number(share) > 100)) {
      throw new Error("지분율은 0~100 사이의 숫자 또는 미정으로 입력해 주세요.");
    }
    return { role, name, share };
  });
}

export function validateSurvey(input: unknown): Survey {
  const body = record(input);
  if (body.agree !== true || body.authority !== true) {
    throw new Error("개인정보 동의와 정보 제공 권한 확인이 필요합니다.");
  }
  const contactName = text(body.contactName, 60);
  const email = text(body.email, 254);
  const phone = text(body.phone, 30);
  if (!contactName || contactName === UNKNOWN || !validEmail(email) || !/^0\d{8,10}$/.test(phone.replace(/[\s()-]/g, ""))) {
    throw new Error("담당자 성함, 이메일, 연락처를 확인해 주세요.");
  }

  const rawCompany = record(body.company);
  const company = Object.fromEntries(companyFields.map(([key]) => [key, text(rawCompany[key], 300)])) as Survey["company"];
  const companyType = choice(body.companyType, companyTypes);
  if (companyType !== UNKNOWN && companyType !== "주식회사") {
    company.sharePrice = "";
    company.authorizedShares = "";
  }
  for (const key of ["sharePrice", "authorizedShares", "capital"] as const) {
    if (company[key] && company[key] !== UNKNOWN && !/^[1-9]\d{0,14}$/.test(company[key])) {
      throw new Error("금액과 주식 수는 0보다 큰 정수 또는 미정으로 입력해 주세요.");
    }
  }
  const companyTypePosition = choice(body.companyTypePosition ?? companyTypePositions[0], companyTypePositions);

  if (!Array.isArray(body.industryCodes) || body.industryCodes.length > maximumIndustrySelections
      || body.industryCodes.some(code => typeof code !== "string" || !industryNames.has(code))) {
    throw new Error(`사업목적은 목록에서 ${maximumIndustrySelections}개까지 선택할 수 있습니다.`);
  }
  const industryCodes = [...new Set<string>(body.industryCodes)];
  const officers = people(body.officers, false);
  const shareholders = people(body.shareholders, true);
  const known = shareholders.filter(person => person.share && person.share !== UNKNOWN);
  const total = known.reduce((sum, person) => sum + Math.round(Number(person.share) * 10000), 0);
  if (total > 1000000 || (known.length === shareholders.length && total !== 1000000)) {
    throw new Error("확정된 지분율 합계는 100%여야 합니다. 일부 지분이 미정이면 현재 합계가 100%를 넘지 않도록 입력해 주세요.");
  }
  const representativeEmail = text(body.representativeEmail, 254);
  if (representativeEmail && representativeEmail !== UNKNOWN && !validEmail(representativeEmail)) {
    throw new Error("대표자 이메일을 확인해 주세요.");
  }
  return {
    contactName, email, phone, company, companyType, companyTypePosition, industryCodes,
    purposes: text(body.purposes, 4000, true), officers, shareholders,
    certificate: choice(body.certificate, choices), otp: choice(body.otp, choices),
    representativeEmail, notes: text(body.notes, 3000, true), agree: true, authority: true,
  };
}

export function formatCompanyName(name: string, companyType: string, position: string) {
  const base = name.trim();
  if (!base || base === UNKNOWN) return UNKNOWN;
  if (companyType === UNKNOWN) return base;
  return position === companyTypePositions[1] ? `${base} ${companyType}` : `${companyType} ${base}`;
}

export function surveyText(survey: Survey) {
  const display = (value: string) => value || UNKNOWN;
  const purposeLines = survey.industryCodes.map(code => `[${code}] ${industryNames.get(code)}`);
  if (survey.purposes && survey.purposes !== UNKNOWN) purposeLines.push(survey.purposes);
  const peopleLines = (entries: Person[], shareholder: boolean) => entries.map((person, index) => {
    const name = display(person.name);
    const detail = shareholder ? `지분율 ${person.share && person.share !== UNKNOWN ? person.share + "%" : UNKNOWN}` : `직위 ${person.role}`;
    return `${index + 1}. ${name} · ${detail}`;
  });
  return [
    "법인설립 기초조사서",
    `【담당자】\n성함: ${survey.contactName}\n이메일: ${survey.email}\n연락처: ${survey.phone}`,
    [
      "【회사 기본정보】",
      `회사 종류: ${survey.companyType}`,
      ...companyFields
        .filter(([key]) => survey.companyType === UNKNOWN || survey.companyType === "주식회사" || (key !== "sharePrice" && key !== "authorizedShares"))
        .map(([key, label]) => {
          const value = key === "companyName" || key === "alternateName"
            ? formatCompanyName(survey.company[key], survey.companyType, survey.companyTypePosition)
            : display(survey.company[key]);
          return `${label}: ${value}`;
        }),
    ].join("\n"),
    ["【사업목적】", ...(purposeLines.length ? [...purposeLines, "위 각호에 부대하는 사업 일체"] : [UNKNOWN])].join("\n"),
    ["【임원】", ...peopleLines(survey.officers, false)].join("\n"),
    ["【주주·사원】", ...peopleLines(survey.shareholders, true)].join("\n"),
    `【전자증명서】\n발급 희망: ${survey.certificate}\n대표자 이메일: ${display(survey.representativeEmail)}\n기기형 OTP: ${survey.otp}`,
    `【기타 요청사항】\n${display(survey.notes)}`,
    "개인정보 수집·이용 및 제3자 정보 제공 권한 확인: 동의함\n동의 안내 버전: incorporation-v2",
  ].join("\n\n");
}
