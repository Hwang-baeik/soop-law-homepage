import { Resend } from "resend";
import { UUID, isHoldingStatus, MATERIAL_LABELS, validateMaterialRequest } from "../../../lib/company-materials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
async function authorize(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization || !/^Bearer \S+$/.test(authorization)) throw new ApiError(401, "다시 로그인해 주세요.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ApiError(503, "현재 서비스를 이용할 수 없습니다.");
  const headers = { apikey: key, Authorization: authorization, "Content-Type": "application/json" };
  const auth = await fetch(`${url}/auth/v1/user`, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (auth.status === 401 || auth.status === 403) throw new ApiError(401, "다시 로그인해 주세요.");
  if (!auth.ok) throw new ApiError(503, "로그인 상태를 확인하지 못했습니다.");
  const user = await auth.json();
  if (typeof user.id !== "string") throw new ApiError(401, "다시 로그인해 주세요.");
  const db = async (path: string, init: RequestInit = {}) => {
    const r = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!r.ok) {
      const detail = await r.json().catch(() => ({}));
      if (detail.code === "P0001" && detail.message === "material request rate limit") throw new ApiError(429, "자료 요청은 10분에 5건까지 가능합니다. 잠시 후 다시 시도해 주세요.");
      if (detail.code === "P0001" && detail.message === "material request conflict") throw new ApiError(409, "요청 내용이 변경되었습니다. 새 요청으로 접수해 주세요.");
      throw new ApiError(r.status === 401 ? 401 : r.status === 403 || detail.code === "42501" ? 403 : 503, "회사 접근권한 또는 자료 처리 상태를 확인해 주세요.");
    }
    return r.status === 204 ? null : r.json();
  };
  const p = (await db(`profiles?id=eq.${encodeURIComponent(user.id)}&select=role,status,must_change_password,display_name`))[0];
  if (!p || p.status !== "approved" || p.must_change_password || !["admin", "staff", "client"].includes(p.role)) throw new ApiError(403, "승인된 계정으로 로그인하고 비밀번호 변경을 완료해 주세요.");
  return { db, user, profile: p };
}
async function companyScope(db: Awaited<ReturnType<typeof authorize>>["db"], id: unknown) {
  if (typeof id !== "string" || !UUID.test(id)) throw new ApiError(400, "회사 정보를 확인해 주세요.");
  const company = (await db(`companies?id=eq.${id}&select=id,name,corporate_registration_number`))[0];
  if (!company) throw new ApiError(403, "이 회사에 대한 접근권한이 없습니다.");
  return company;
}
async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ApiError(415, "지원하지 않는 요청 형식입니다.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "요청 내용을 확인해 주세요.");
  const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 4096) { await reader.cancel(); throw new ApiError(413, "요청 내용이 너무 깁니다."); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new ApiError(400, "요청 내용을 확인해 주세요."); }
}
function fail(error: unknown) { return error instanceof ApiError ? json({ error: error.message }, error.status) : json({ error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503); }
export async function GET(request: Request) {
  try {
    const { db, user } = await authorize(request);
    const company = await companyScope(db, new URL(request.url).searchParams.get("companyId"));
    const [holdings, canManage, canRequest] = await Promise.all([
      db(`company_material_holdings?company_id=eq.${company.id}&select=articles_status,shareholder_register_status,checked_at`),
      db("rpc/can_manage_company_materials", { method: "POST", body: JSON.stringify({ p_company: company.id }) }),
      db("rpc/can_request_company_materials", { method: "POST", body: JSON.stringify({ p_company: company.id }) }),
    ]);
    return json({ company, holdings: holdings[0] ?? { articles_status: "unknown", shareholder_register_status: "unknown", checked_at: null }, canManage: canManage === true, canRequest: canRequest === true, email: user.email || "" });
  } catch (error) { return fail(error); }
}
export async function PATCH(request: Request) {
  try {
    const { db } = await authorize(request); const body = await readBody(request);
    if (!body || !isHoldingStatus(body.articlesStatus) || !isHoldingStatus(body.shareholderRegisterStatus)) throw new ApiError(400, "보관상태를 확인해 주세요.");
    const company = await companyScope(db, body.companyId);
    if (await db("rpc/can_manage_company_materials", { method: "POST", body: JSON.stringify({ p_company: company.id }) }) !== true) throw new ApiError(403, "사무소의 자료관리 담당자만 보관현황을 수정할 수 있습니다.");
    await db("company_material_holdings?on_conflict=company_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ company_id: company.id, articles_status: body.articlesStatus, shareholder_register_status: body.shareholderRegisterStatus }) });
    return json({ message: "사무소 보관현황을 저장했습니다." });
  } catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  try {
    const { db, profile } = await authorize(request);
    let body; try { body = validateMaterialRequest(await readBody(request)); } catch (e) { if (e instanceof ApiError) throw e; throw new ApiError(400, e instanceof Error ? e.message : "요청 내용을 확인해 주세요."); }
    const company = await companyScope(db, body.companyId);
    if (await db("rpc/can_request_company_materials", { method: "POST", body: JSON.stringify({ p_company: company.id }) }) !== true) throw new ApiError(403, "자료 요청 권한이 있는 관리회사에 대해서만 요청할 수 있습니다.");
    if (!process.env.RESEND_API_KEY) throw new ApiError(503, "현재 요청 메일을 보낼 수 없습니다. 사무소로 연락해 주세요.");
    // The database rechecks company access, limits request frequency and freezes retry payloads.
    const record = await db("rpc/register_company_material_request", { method: "POST", body: JSON.stringify({ p_id: body.requestId, p_company: company.id, p_reply_email: body.replyEmail, p_types: body.types }) });
    if (!record?.id || !record.created_at) throw new ApiError(503, "요청 접수를 확인하지 못했습니다.");
    if (Date.now() - new Date(record.created_at).getTime() > 23 * 60 * 60 * 1000) throw new ApiError(409, "이 요청의 재시도 기간이 지났습니다. 새 요청으로 접수해 주세요.");
    const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: "숲 법무사 사무소 <soop@sooplaw.com>", to: ["soop@sooplaw.com"], replyTo: body.replyEmail,
      subject: `[회사자료 요청] ${company.name.replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 120)}`,
      text: `회사명: ${company.name}\n법인등록번호: ${company.corporate_registration_number}\n요청자료: ${body.types.map(t => MATERIAL_LABELS[t]).join(" · ")}\n요청자: ${profile.display_name || "회원"}\n회신 요청 주소: ${body.replyEmail}\n요청번호: ${record.id}\n\n홈페이지에서 관리회사에 대한 자료 요청이 접수되었습니다.\n회신 주소는 요청자가 입력한 주소이며 인증된 수신 주소를 의미하지 않습니다. 자료 제공 권한과 주소를 확인한 후 별도로 회신해 주세요.\n자료 파일은 이 메일에 첨부되지 않습니다.`,
    }, { idempotencyKey: `company-material/${record.id}` });
    if (error || !data?.id) throw new ApiError(502, "요청 기록은 접수했으나 메일 발송 접수를 확인하지 못했습니다. 같은 내용으로 다시 시도해 주세요.");
    return json({ message: "사무소에 요청 메일 발송이 접수되었습니다. 사무소 확인 후 기재하신 주소로 별도 회신합니다. 실제 메일 도착 여부는 별도 확인이 필요합니다.", requestId: record.id });
  } catch (error) { return fail(error); }
}
