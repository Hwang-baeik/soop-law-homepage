import catalog from "./ksic-data";

export const maximumIndustrySelections = 50;

export const industryLevels = [
  { digits: "3", name: "소분류" },
  { digits: "4", name: "세분류" },
  { digits: "5", name: "세세분류" },
] as const;

const aliases: Record<string, string> = {
  "4791": "쇼핑몰 온라인쇼핑몰 전자상거래 인터넷쇼핑몰 스마트스토어",
  "5611": "식당 음식점 식사",
  "5622": "카페 커피숍",
  "5822": "앱개발 어플리케이션 솔루션 SaaS",
  "6201": "홈페이지개발 웹개발 앱개발 프로그래밍 SI",
  "7131": "광고 마케팅 대행",
};

const normalizeSearch = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[\s,·ㆍ․]/g, "");

export const industryGroups = catalog.map(([code, name, rows]) => {
  const keywords = new Map<string, string>();
  for (const [code, label] of rows) {
    const search = normalizeSearch(`${label} ${aliases[code.slice(0, 4)] ?? ""}`);
    keywords.set(code, `${keywords.get(code) ?? ""} ${search}`);
    for (const length of [3, 4]) {
      if (code.length <= length) continue;
      const parent = code.slice(0, length);
      keywords.set(parent, `${keywords.get(parent) ?? ""} ${search}`);
    }
  }
  return {
    code,
    name,
    industries: rows.map(([code, name]) => ({
      code, name, search: keywords.get(code) ?? "",
    })),
  };
});

export const industryNames = new Map(
  industryGroups.flatMap(group => group.industries.map(({ code, name }) => [code, name])),
);

export function matchesIndustry(industry: { code: string; search: string }, query: string) {
  return query.trim().split(/\s+/).map(normalizeSearch).every(word =>
    /^\d+$/.test(word) ? industry.code.startsWith(word) : industry.search.includes(word),
  );
}
