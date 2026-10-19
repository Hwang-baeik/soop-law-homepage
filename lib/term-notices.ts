export type TermDeadline = {
  source_type: string; source_id: string; company_id: string; company_name: string;
  title: string; person_name: string | null; target_date: string | null;
  status: string; details: Record<string, unknown>;
};
export type NoticeContact = { id: string; value: string; label: string | null; contact_name: string | null; is_primary: boolean };
export type NoticeCompany = {
  id: string; name: string; officers: TermDeadline[]; contacts: NoticeContact[]; revision: string;
};
export function seoulToday(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
export function isDueOfficer(row: TermDeadline, today: string) {
  return row.source_type === "officer" && row.status === "active" && Boolean(row.target_date && row.target_date >= today && row.target_date <= addDays(today, 45));
}
export function validEmail(value: string) {
  return value.length <= 254 && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
}
export function createNoticeDraft(company: NoticeCompany) {
  return {
    subject: `[숲 법무사 사무소] ${company.name} 임원 임기 만료 예정 안내`,
    text: `${company.name} 담당자님께\n\n안녕하세요. 숲 법무사 사무소입니다.\n\n당 사무소의 관리 자료상 아래 임원의 임기 만료가 예정되어 있어 안내드립니다.\n\n${company.officers.map(o => `• ${o.title} ${o.person_name || "(성명 미등록)"}: ${o.target_date?.replaceAll("-", ".")} 임기 만료 예정`).join("\n")}\n\n위 일정은 현재 등록된 자료를 기준으로 작성하였습니다. 정관의 임기 규정, 정기주주총회 종결 시점 및 최근 변경 사항 등에 따라 실제 만료일이 달라질 수 있으므로 확인 부탁드립니다.\n\n중임 또는 퇴임·신규 선임 예정 여부와 주주총회 등 관련 일정을 회신해 주시면, 확인 후 필요한 절차와 준비 서류를 안내드리겠습니다. 이미 관련 절차를 진행하셨거나 등록 내용과 다른 사항이 있다면 함께 알려주시기 바랍니다.\n\n감사합니다.\n\n숲 법무사 사무소\n전화: 02-6956-8683\n이메일: soop@sooplaw.com`,
  };
}
