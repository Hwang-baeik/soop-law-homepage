export type TermDeadline = {
  source_type: string; source_id: string; company_id: string; company_name: string;
  title: string; person_name: string | null; target_date: string | null;
  status: string; details: Record<string, unknown>;
};
export type NoticeContact = { id: string; value: string; label: string | null; contact_name: string | null; is_primary: boolean };
export type NoticeCompany = {
  id: string; name: string; officers: TermDeadline[]; contacts: NoticeContact[]; revision: string;
};

export const noticeSender = "soop@sooplaw.com";
export const noticeSubject = "[숲법무사사무소]_법인 임원 임기연장 안내의 건";
export const noticeRanges = {
  upcoming: "만료일 오늘~45일 이내",
  "overdue-45": "1~45일 경과",
  "overdue-90": "46~90일 경과",
  "overdue-135": "91~135일 경과",
  "overdue-older": "136일 이상 경과",
  overdue: "경과 법인 전체",
  all: "경과 전체 및 45일 이내 예정",
} as const;
export type NoticeRange = keyof typeof noticeRanges;
export const noticeBatchSize = 10;
export type NoticeMail = { companyId: string; contactId: string; recipient: string; revision: string; subject: string; text: string };
export type NoticeSendResult = { companyId: string; id?: string; message: string };

export function isNoticeRange(value: unknown): value is NoticeRange {
  return typeof value === "string" && Object.hasOwn(noticeRanges, value);
}
export function seoulToday(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
export function isDueOfficer(row: TermDeadline, today: string) {
  return isOfficerInRange(row, today, "upcoming");
}
export function isOfficerInRange(row: TermDeadline, today: string, range: NoticeRange) {
  if (row.source_type !== "officer" || row.status !== "active" || !row.target_date) return false;
  const days = (Date.parse(today) - Date.parse(row.target_date)) / 86_400_000;
  switch (range) {
    case "upcoming": return days >= -45 && days <= 0;
    case "overdue-45": return days >= 1 && days <= 45;
    case "overdue-90": return days >= 46 && days <= 90;
    case "overdue-135": return days >= 91 && days <= 135;
    case "overdue-older": return days >= 136;
    case "overdue": return days > 0;
    case "all": return days >= -45;
  }
}
export function defaultNoticeContact(contacts: NoticeContact[]) {
  const distinct = (items: NoticeContact[]) => [...new Map(items.map(c => [c.value.toLowerCase(), c])).values()];
  const primary = distinct(contacts.filter(c => c.is_primary));
  if (primary.length === 1) return primary[0].id;
  const options = distinct(contacts);
  return options.length === 1 ? options[0].id : "";
}
export function validEmail(value: string) {
  return value.length <= 254 && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
}
export function createNoticeDraft(company: {
  name: string;
  officers: Pick<TermDeadline, "title" | "person_name" | "target_date">[];
}) {
  const officers = company.officers.map(officer => {
    const date = officer.target_date?.split("-").map(Number);
    const expiry = date ? `${date[0]}년 ${date[1]}월 ${date[2]}일` : "만료일 미확정";
    return `• ${officer.title} ${officer.person_name || "(성명 미등록)"} · 임기 만료일 ${expiry}`;
  }).join("\n");
  return {
    subject: noticeSubject,
    text: `${company.name} 담당자님께

안녕하세요. 숲 법무사 사무소입니다. 잘 지내고 계신가요?

저희 사무소에서 관리하고 있는 마지막 자료에 따르면 귀사 임원의 임기 만료일은 아래와 같습니다.

${officers}

임기 만료일은 정관, 정기주주총회 종결 시점 및 최근 변경 사항에 따라 달라질 수 있으니 확인 부탁드립니다. 계속 재임하실 예정이고 아직 중임 절차를 진행하지 않으셨다면 중임 결의와 등기를 도와드리고자 메일 드립니다.

주식회사 이사의 임기는 원칙적으로 3년을 초과할 수 없으며, 정관에 따라 일정한 경우 정기주주총회 종결 시까지 연장할 수 있습니다. 회사의 마지막 등기 후 5년이 경과하고 법원행정처장의 공고에 따른 절차가 이행되지 않으면 휴면회사 해산간주 대상이 될 수 있습니다.

주식회사의 임원 변경등기는 원칙적으로 등기 사유가 발생한 날부터 본점 소재지에서 2주 이내에 해야 하며, 등기를 게을리하면 과태료가 부과될 수 있습니다. 이미 처리하셨거나 임기 정보가 다르면 알려주시고, 중임 등기가 필요하시면 회신 부탁드립니다.

감사합니다.

숲 법무사 사무소
전화 02-6956-8683
이메일 ${noticeSender}`,
  };
}
