import IncorporationForm from "../../components/incorporation-form";
export const metadata = { title: "법인설립 기초조사서 | 숲 법무사 사무소", description: "주식회사 설립에 필요한 정보를 작성하여 숲 법무사 사무소에 전달하세요." };
export default function IncorporationPage() {
  return <main id="main-content" className="flex-1 bg-stone-50 px-5 py-12 sm:py-16"><div className="mx-auto max-w-5xl"><p className="text-sm font-semibold tracking-widest text-emerald-900">CORPORATE ESTABLISHMENT</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">법인설립 기초조사서</h1><p className="mb-8 mt-4 leading-7 text-stone-600">정해진 내용부터 편하게 알려주세요. 보내주신 내용을 바탕으로 사무소에서 설립서류를 준비하고, 추가 확인이 필요한 사항은 따로 연락드립니다.</p><IncorporationForm /></div></main>;
}
