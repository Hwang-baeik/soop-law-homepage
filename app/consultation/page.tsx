import { ConsultationForm } from "../../components/consultation-form";

export const metadata = {
  title: "문의메일 보내기 | 숲 법무사 사무소",
  description: "상담 내용을 작성해 숲 법무사 사무소에 보내세요.",
};

export default function ConsultationPage() {
  return (
    <main id="main-content" className="flex-1 bg-stone-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-950 sm:text-4xl">문의메일 보내기</h1>
        <p className="mt-3 text-sm leading-7 text-stone-700 sm:text-base">
          문의 내용을 작성하면 사무소로 전달됩니다. 답변을 받을 이메일 주소를 입력해 주세요.
        </p>
        <ConsultationForm />
      </div>
    </main>
  );
}
