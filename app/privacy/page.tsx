import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-12 text-stone-900">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm md:p-10">
        <p className="text-xs font-bold tracking-[0.16em] text-emerald-800">PRIVACY</p>
        <h1 className="mt-2 text-3xl font-extrabold">개인정보 처리방침</h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">숲 법무사 사무소는 회원서비스와 상담·법무 업무 제공에 필요한 범위에서 개인정보를 처리하며, 목적 달성 후에는 법령 또는 업무상 보존 의무가 있는 정보를 제외하고 지체 없이 파기하는 것을 원칙으로 합니다.</p>

        <div className="mt-8 grid gap-7 text-sm leading-7 text-stone-700">
          <section><h2 className="text-lg font-extrabold text-stone-950">1. 처리 목적</h2><p className="mt-2">회원 식별 및 로그인, 가입 승인, 회사별 접근권한 관리, 상담 및 법무업무 수행, 문서·기한 관리, 보안 및 감사기록 관리, 문의·분쟁 대응을 위해 처리합니다.</p></section>
          <section><h2 className="text-lg font-extrabold text-stone-950">2. 수집 항목</h2><p className="mt-2">회원가입 시 회사명, 가입자 성명, 법인등록번호, 연락처, 이메일을 수집합니다. 비밀번호는 인증서비스에서 암호화된 인증정보로 관리되며 사이트 운영자가 평문 비밀번호를 열람하도록 설계하지 않습니다. 회사 관리 과정에서는 임원 성명·직책·임기정보, 회사 문서 및 업무에 필요한 정보가 추가될 수 있습니다.</p></section>
          <section><h2 className="text-lg font-extrabold text-stone-950">3. 보유 및 이용기간</h2><p className="mt-2">회원정보는 회원관계가 유지되는 동안 보유합니다. 탈퇴 요청 시 서비스 접근을 즉시 중지하고, 계정정보는 보존 필요자료 검토 후 삭제합니다. 다만 법령상 보존의무, 사건처리·본인확인·분쟁대응 등 정당한 보존 필요가 있는 자료는 회원 계정정보와 분리하여 필요한 기간 동안 보관할 수 있습니다.</p></section>
          <section><h2 className="text-lg font-extrabold text-stone-950">4. 개인정보의 파기</h2><p className="mt-2">보존 사유가 종료된 개인정보는 복구가 어렵도록 삭제합니다. 회원 탈퇴 시 로그인 인증정보와 회원 프로필·회사 접근권한을 삭제하고, 회사의 등기·사건 원본자료는 별도의 보존근거가 있는 경우에 한하여 유지합니다.</p></section>
          <section><h2 className="text-lg font-extrabold text-stone-950">5. 접근통제 및 안전조치</h2><p className="mt-2">회원·직원·관리자 권한을 구분하고 회사별 접근권한을 적용합니다. 문서 저장소는 비공개로 운영하고 데이터베이스 Row Level Security를 적용합니다. 관리자 권한행위는 감사기록을 남기며, 필요한 범위의 최소 권한만 부여하는 것을 원칙으로 합니다.</p></section>
          <section><h2 className="text-lg font-extrabold text-stone-950">6. 정보주체의 권리</h2><p className="mt-2">회원은 자신의 계정정보 확인·정정, 비밀번호 변경 및 회원탈퇴를 요청할 수 있습니다. 법령상 제한 또는 다른 사람의 권리 보호가 필요한 경우 일부 요청이 제한될 수 있습니다.</p></section>
          <section><h2 className="text-lg font-extrabold text-stone-950">7. 처리위탁 및 국외 처리</h2><p className="mt-2">사이트 운영 과정에서 호스팅·데이터베이스·인증·이메일 등 외부 클라우드 서비스를 사용할 수 있습니다. 실제 운영에 사용하는 수탁업체와 국외 이전 여부·항목·국가·보유기간은 서비스 구성 확정 후 본 방침에 구체적으로 반영합니다.</p></section>
          <section><h2 className="text-lg font-extrabold text-stone-950">8. 개인정보 보호 문의</h2><p className="mt-2">개인정보 관련 문의는 숲 법무사 사무소(02-6956-8683, soop@sooplaw.com)로 연락하실 수 있습니다.</p></section>
        </div>

        <div className="mt-10 border-t border-stone-200 pt-6 text-sm"><Link href="/" className="font-bold text-emerald-900">← 홈으로</Link></div>
      </article>
    </main>
  );
}
