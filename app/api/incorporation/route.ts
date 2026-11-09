import { formFailure, FormError, json, readForm, sendProtectedMail } from "../../../lib/form-security";
import { prepareSurveyMail } from "../../../lib/incorporation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await readForm(request);
    let mail;
    try {
      mail = prepareSurveyMail(body.survey, body.mode);
    } catch (error) {
      throw new FormError(error instanceof Error ? error.message : "입력 내용을 확인해 주세요.");
    }
    const subject = `[법인설립 기초조사서] ${mail.contactName.replace(/[\r\n]/g, " ")}`;
    const receipt = await sendProtectedMail(request, "incorporation", mail.email, subject, mail.text);
    return json({ message: "기초조사서가 사무소로 접수되었습니다. 담당자가 내용을 확인한 뒤 연락드리겠습니다.", receipt });
  } catch (error) { return formFailure(error); }
}
