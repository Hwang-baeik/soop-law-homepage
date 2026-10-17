export const contactCategories = ["법인등기", "부동산등기", "법원 서류", "고소장", "기타"] as const;
export const contactLimits = { email: 254, nameOrCompany: 100, message: 5000 };

export function validateContact(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "상담 신청 내용을 확인해 주세요." } as const;
  }
  const input = body as Record<string, unknown>;
  const fields = ["email", "nameOrCompany", "category", "message"] as const;
  if (fields.some((key) => typeof input[key] !== "string")) {
    return { error: "필수 입력값을 확인해 주세요." } as const;
  }
  const email = (input.email as string).trim();
  const nameOrCompany = (input.nameOrCompany as string).trim();
  const category = (input.category as string).trim();
  const message = (input.message as string).trim();
  if (!email || !nameOrCompany || !category || !message) {
    return { error: "필수 입력값이 누락되었습니다." } as const;
  }
  if (email.length > contactLimits.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "메일주소 형식이 올바르지 않습니다." } as const;
  }
  if (nameOrCompany.length > contactLimits.nameOrCompany || /[\r\n\x00-\x1f\x7f]/.test(nameOrCompany)) {
    return { error: "성명(법인명)은 줄바꿈 없이 100자 이내로 입력해 주세요." } as const;
  }
  if (!contactCategories.some((value) => value === category)) {
    return { error: "업무 분류를 다시 선택해 주세요." } as const;
  }
  if (message.length > contactLimits.message) {
    return { error: "문의 내용은 5,000자 이내로 입력해 주세요." } as const;
  }
  if (input.agree !== true) {
    return { error: "개인정보 수집 및 이용 동의가 필요합니다." } as const;
  }
  return { data: { email, nameOrCompany, category, message } } as const;
}
