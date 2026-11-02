import { formFailure, FormError, json, readForm, sendProtectedMail } from "../../../lib/form-security";
import { surveyText, validateSurvey } from "../../../lib/incorporation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const b = await readForm(request);
    let survey;
    try { survey = validateSurvey(b.survey); } catch (error) { throw new FormError(error instanceof Error ? error.message : "입력 내용을 확인해 주세요."); }
    const receipt = await sendProtectedMail(request, "incorporation", survey.email, `[법인설립 기초조사서] ${survey.contactName.replace(/[\r\n]/g, " ")}`, surveyText(survey));
    return json({ message: "기초조사서가 사무소로 접수되었습니다. 담당자가 내용을 확인한 뒤 연락드리겠습니다.", receipt });
  } catch (error) { return formFailure(error); }
}
