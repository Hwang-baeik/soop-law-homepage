import { useState } from "react";
import { industryGroups, industryNames, matchesIndustry, maximumIndustrySelections } from "../lib/ksic";

const controlClass = "min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-950 focus-visible:outline-2 focus-visible:outline-emerald-800";

export function PurposePicker({ selected, onChange }: { selected: string[]; onChange: (codes: string[]) => void }) {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 24;
  const results = industryGroups
    .filter(group => !category || group.code === category)
    .flatMap(group => group.industries.filter(entry => matchesIndustry(entry, query)));
  const displayed = results.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.ceil(results.length / pageSize);

  function toggle(code: string) {
    onChange(selected.includes(code) ? selected.filter(value => value !== code) : [...selected, code]);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-stone-700">한국표준산업분류 제11차 세분류입니다. 업종명, 관련 업종 또는 분류코드로 검색하고 여러 항목을 선택할 수 있습니다.</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <label className="grid gap-2 text-sm font-semibold text-stone-700">
          업종 카테고리
          <select className={controlClass} value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}>
            <option value="">모든 카테고리</option>
            {industryGroups.map(group => <option value={group.code} key={group.code}>{group.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-700">
          업종 검색
          <input className={controlClass} type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}
            onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }}
            maxLength={100} placeholder="예: 쇼핑몰, 소프트웨어, 6201" />
        </label>
      </div>
      <div className="rounded-xl border border-stone-200 p-3 sm:p-4">
        <p role="status" className="mb-3 text-sm text-stone-700">검색 결과 {results.length}개 · 선택 {selected.length}/{maximumIndustrySelections}개</p>
        {displayed.length ? (
          <ul className="grid gap-2 sm:grid-cols-2" aria-label="사업목적 검색 결과">
            {displayed.map(({ code, name }) => {
              const checked = selected.includes(code);
              return <li key={code}>
                <label className="flex min-h-11 items-start gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-900 has-checked:bg-emerald-50">
                  <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-emerald-900" checked={checked} disabled={!checked && selected.length >= maximumIndustrySelections} onChange={() => toggle(code)} />
                  <span><span className="mr-1 text-stone-500">{code}</span> {name}</span>
                </label>
              </li>;
            })}
          </ul>
        ) : <p className="text-sm text-stone-600">일치하는 업종이 없습니다. 검색어나 카테고리를 바꾸거나 아래에 직접 작성해 주세요.</p>}
        {pageCount > 1 && <div className="mt-4 flex items-center justify-end gap-3 text-sm">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="min-h-11 px-2 font-semibold text-emerald-900 disabled:text-stone-500">이전</button>
          <span aria-live="polite">{page} / {pageCount} 페이지</span>
          <button type="button" disabled={page === pageCount} onClick={() => setPage(page + 1)} className="min-h-11 px-2 font-semibold text-emerald-900 disabled:text-stone-500">다음</button>
        </div>}
      </div>
      {selected.length > 0 && (
        <div className="rounded-xl bg-emerald-50 p-4">
          <h3 className="text-sm font-bold text-emerald-950">선택한 사업목적</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {selected.map(code => <li key={code}>
              <button type="button" aria-label={industryNames.get(code) + " 선택 해제"} onClick={() => toggle(code)}
                className="min-h-11 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left text-sm text-emerald-950 hover:border-emerald-700">
                {code} {industryNames.get(code)} <span aria-hidden="true">×</span>
              </button>
            </li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
