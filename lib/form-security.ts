import { checkBotId } from "botid/server";
import { ipAddress } from "@vercel/functions";
import { createHash } from "node:crypto";

export class FormError extends Error { constructor(message: string, public status = 400, public retryAfter = 600) { super(message); } }
export const json = (data: unknown, status = 200, retryAfter = 600) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", ...(status === 429 ? { "Retry-After": String(retryAfter) } : {}) } });
// Secondary instance-local backstop. BotID and Vercel's edge DDoS protections remain primary.
const counters = new Map<string, { count: number; expires: number }>();
const verifiedRequests = new WeakSet<Request>();
export function limit(key: string, maximum: number, seconds = 600) {
  const now = Date.now();
  for (const [bucket, value] of counters) if (value.expires <= now) counters.delete(bucket);
  const old = counters.get(key);
  if (old && old.count >= maximum) throw new FormError("접수 요청이 많습니다. 잠시 후 다시 시도하거나 02-6956-8683으로 연락해 주세요.", 429, Math.max(1, Math.ceil((old.expires - now) / 1000)));
  if (!old && counters.size >= 2048) throw new FormError("현재 온라인 접수가 많습니다. 잠시 후 다시 시도해 주세요.", 503);
  counters.set(key, { count: (old?.count || 0) + 1, expires: old?.expires || now + seconds * 1000 });
}
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export async function readForm(request: Request, maximum = 49152): Promise<Record<string, unknown>> {
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const protocol = request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1);
  if (request.headers.get("origin") !== `${protocol}://${host}`) throw new FormError("요청 출처를 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요.", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new FormError("지원하지 않는 요청 형식입니다.", 415);
  if (Number(request.headers.get("content-length")) > maximum) throw new FormError("입력 내용이 너무 깁니다.", 413);
  // Verify before allocating request counters or consuming an untrusted request stream.
  const verification = await checkBotId({ advancedOptions: { checkLevel: "basic" } });
  if (verification.isBot) throw new FormError("자동입력 방지 확인에 실패했습니다. 브라우저에서 다시 시도하거나 사무소로 연락해 주세요.", 403);
  verifiedRequests.add(request);
  const identity = digest(ipAddress(request) || "unidentified");
  limit(`attempt:${identity}`, 20);
  limit("attempt:instance", 1000, 60);
  const reader = request.body?.getReader();
  if (!reader) throw new FormError("입력 내용이 없습니다.");
  let timedOut = false;
  const deadline = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 8000);
  const decoder = new TextDecoder(); let size = 0, raw = "";
  try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > maximum) { await reader.cancel(); throw new FormError("입력 내용이 너무 깁니다.", 413); } raw += decoder.decode(chunk.value, { stream: true }); } raw += decoder.decode(); }
  finally { clearTimeout(deadline); reader.releaseLock(); }
  if (timedOut) throw new FormError("전송 시간이 초과되었습니다. 다시 시도해 주세요.", 408);
  let b;
  try { b = JSON.parse(raw); } catch { throw new FormError("입력 내용을 확인해 주세요."); }
  if (!b || typeof b !== "object" || Array.isArray(b)) throw new FormError("입력 내용을 확인해 주세요.");
  if (b.website !== "") throw new FormError("접수 내용을 확인해 주세요.");
  if (typeof b.requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(b.requestId)) throw new FormError("화면을 새로고침 후 다시 시도해 주세요.");
  return b;
}
export async function sendProtectedMail(request: Request, action: string, email: string, subject: string, text: string) {
  if (!process.env.RESEND_API_KEY) throw new FormError("온라인 접수를 이용할 수 없습니다. 전화 02-6956-8683 또는 soop@sooplaw.com으로 문의해 주세요.", 503);
  if (!verifiedRequests.has(request)) throw new FormError("자동입력 방지 확인이 필요합니다.", 403);
  limit(`delivery:${digest(ipAddress(request) || "unidentified")}`, 5);
  limit("delivery:instance-hour", 50, 3600);
  limit("delivery:instance-day", 200, 86400);
  // Content-derived key suppresses identical email across retries, request IDs and function instances.
  const key = digest(JSON.stringify({ action, email, subject, text }));
  const receipt = `SOOP-${key.slice(0, 12).toUpperCase()}`;
  try {
    const result = await fetch("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(12000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `soop-form-v1/${key}` }, body: JSON.stringify({ from: "숲 법무사 사무소 <contact@sooplaw.com>", to: ["soop@sooplaw.com"], reply_to: email, subject, text: `접수번호: ${receipt}\n\n${text}` }) });
    const data = await result.json() as { id?: string };
    if (!result.ok || !data.id) throw new Error("Mail acceptance not confirmed");
    return receipt;
  } catch { throw new FormError("메일 접수 결과를 확인하지 못했습니다. 입력 내용을 유지한 채 다시 시도하거나 사무소에 연락해 주세요.", 503); }
}
export function formFailure(error: unknown) { return error instanceof FormError ? json({ message: error.message }, error.status, error.retryAfter) : json({ message: "접수 서비스에 연결하지 못했습니다. 입력 내용을 유지한 채 다시 시도하거나 02-6956-8683으로 문의해 주세요." }, 503); }
