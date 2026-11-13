import catalog from "./ksic-data";

export const maximumIndustrySelections = 50;

const aliases: Record<string, string> = {
  "4791": "쇼핑몰 온라인쇼핑몰 전자상거래 인터넷쇼핑몰 스마트스토어",
  "5611": "식당 음식점 식사",
  "5622": "카페 커피숍",
  "5822": "앱개발 어플리케이션 솔루션 SaaS",
  "6201": "홈페이지개발 웹개발 앱개발 프로그래밍 SI",
  "7131": "광고 마케팅 대행",
};

export const industryGroups = catalog.map(([code, name, rows]) => ({
  code,
  name,
  industries: rows.map(([code, name, details]) => ({
    code, name, search: `${code} ${name} ${details || code + "0"} ${aliases[code] ?? ""}`,
  })),
}));

export const industryNames = new Map(
  industryGroups.flatMap(group => group.industries.map(({ code, name }) => [code, name])),
);

const normalizeSearch = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[\s,·ㆍ․]/g, "");

export function matchesIndustry(industry: { search: string }, query: string) {
  const haystack = normalizeSearch(industry.search);
  return query.trim().split(/\s+/).every(word => haystack.includes(normalizeSearch(word)));
}
