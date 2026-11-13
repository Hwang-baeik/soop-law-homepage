import IncorporationForm from "../../components/incorporation-form";

export const metadata = {
  title: "법인설립 기초조사서 | 숲 법무사 사무소",
  description: "법인설립에 필요한 기초정보를 작성해 숲 법무사 사무소로 보내세요.",
};

export default function IncorporationPage() {
  return (
    <main id="main-content" className="flex-1 bg-stone-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-950 sm:text-4xl">법인설립 기초조사서</h1>
        <p className="mb-6 mt-3 max-w-2xl text-sm leading-7 text-stone-700 sm:text-base">보내주신 내용을 바탕으로 설립서류를 준비합니다. 페이지를 닫거나 새로고침하면 작성 중인 내용이 사라집니다.</p>
        <IncorporationForm />
      </div>
    </main>
  );
}
