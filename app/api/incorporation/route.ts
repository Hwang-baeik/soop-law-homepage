import { createHash } from "node:crypto";
import { Resend } from "resend";
import { officeMail } from "../../../lib/office-mail";
import { surveyText, validateSurvey } from "../../../lib/incorporation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maximumBytes = 48 * 1024;
const windowMs = 10 * 60 * 1000;
const attempts = new Map<string, number>();
let expiresAt = 0;
let totalAttempts = 0;
let deliveries = 0;

function json(message: string, status: number, headers?: HeadersInit) {
  return Response.json({ message }, { status, headers });
}

function enforceLimit(request: Request) {
  const now = Date.now();
  if (now >= expiresAt) {
    attempts.clear();
    totalAttempts = 0;
    deliveries = 0;
    expiresAt = now + windowMs;
  }
  // Vercel overwrites x-vercel-forwarded-for. The instance-wide cap also covers unknown IPs.
  const ip = request.headers.get("x-vercel-forwarded-for") || "unknown";
  const count = attempts.get(ip) ?? 0;
  if (totalAttempts >= 180 || count >= 12) return false;
  totalAttempts += 1;
  attempts.set(ip, count + 1);
  return true;
}

function throttled() {
  return json("접수 요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429, {
    "Retry-After": String(Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000))),
  });
}

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return json("입력 내용이 없습니다.", 400);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let raw = "";
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => {});
  }, 8000);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (timedOut) return json("전송 시간이 초과되었습니다. 다시 시도해 주세요.", 408);
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        void reader.cancel().catch(() => {});
        return json("입력 내용이 너무 깁니다.", 413);
      }
      raw += decoder.decode(value, { stream: true });
    }
    const body: unknown = JSON.parse(raw + decoder.decode());
    return body;
  } catch {
    void reader.cancel().catch(() => {});
    return json("입력 내용을 확인해 주세요.", 400);
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const protocol = request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1);
  if (request.headers.get("origin") !== `${protocol}://${host}`) {
    return json("요청 출처를 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요.", 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json("지원하지 않는 요청 형식입니다.", 415);
  }
  if (!enforceLimit(request)) return throttled();
  if (Number(request.headers.get("content-length")) > maximumBytes) return json("입력 내용이 너무 깁니다.", 413);

  const body = await readBody(request);
  if (body instanceof Response) return body;
  if (!body || typeof body !== "object" || !("website" in body) || body.website !== "" || !("survey" in body)) {
    return json("접수 내용을 확인해 주세요.", 400);
  }

  let survey;
  try {
    survey = validateSurvey(body.survey);
  } catch (error) {
    return json(error instanceof Error ? error.message : "입력 내용을 확인해 주세요.", 400);
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return json("온라인 접수를 이용할 수 없습니다. 02-6956-8683 또는 soop@sooplaw.com으로 문의해 주세요.", 503);
  if (deliveries >= 25) return throttled();
  deliveries += 1;

  const text = surveyText(survey);
  const key = createHash("sha256").update(text).digest("hex");
  const receipt = `SOOP-${key.slice(0, 12).toUpperCase()}`;
  try {
    const { data, error } = await new Resend(apiKey).emails.send({
      ...officeMail,
      replyTo: survey.email,
      subject: `[법인설립 기초조사서] ${survey.contactName}`,
      text: `접수번호: ${receipt}\n\n${text}`,
    }, { idempotencyKey: `soop-incorporation/${key}` });
    if (error || !data?.id) throw new Error("Mail acceptance not confirmed");
    return Response.json({ receipt, message: "기초조사서가 접수되었습니다. 담당자가 내용을 확인한 뒤 연락드리겠습니다." });
  } catch {
    return json("메일 접수 결과를 확인하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하거나 사무소에 연락해 주세요.", 503);
  }
}
