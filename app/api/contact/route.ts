import { validateContact } from "../../../lib/contact";
import { formFailure, FormError, json, readForm, sendProtectedMail } from "../../../lib/form-security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await readForm(request, 32768);
    const validated = validateContact(body);
    if (validated.error) throw new FormError(validated.error);
    const { email, nameOrCompany, category, message } = validated.data;
    await sendProtectedMail(request, "contact", email, `[홈페이지문의] ${nameOrCompany} / ${category}`, `홈페이지 상담 문의\n\n성명(법인명): ${nameOrCompany}\n이메일: ${email}\n업무 분류: ${category}\n\n${message}\n\n개인정보 수집·이용: 동의함`);
    return json({ message: "상담 신청이 정상적으로 접수되었습니다." });
  } catch (error) { return formFailure(error); }
}
