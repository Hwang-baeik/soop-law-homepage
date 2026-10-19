import { createHash } from "node:crypto";
import { Resend } from "resend";
import { addDays, isDueOfficer, seoulToday, validEmail, type NoticeCompany, type NoticeContact, type TermDeadline } from "../../../lib/term-notices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function authorize(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization || !/^Bearer \S+$/.test(authorization)) throw new ApiError(401, "다시 로그인해 주세요.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ApiError(503, "현재 서비스를 이용할 수 없습니다.");
  const headers = { apikey: key, Authorization: authorization, "Content-Type": "application/json" };
  const userResponse = await fetch(`${url}/auth/v1/user`, { headers, cache: "no-store" });
  if (userResponse.status === 401 || userResponse.status === 403) throw new ApiError(401, "다시 로그인해 주세요.");
  if (!userResponse.ok) throw new ApiError(503, "로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  const user = await userResponse.json();
  if (!user.id) throw new ApiError(401, "다시 로그인해 주세요.");
  const db = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers }, cache: "no-store" });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      const forbidden = response.status === 403 || detail.message === "not authorized";
      throw new ApiError(response.status === 401 ? 401 : forbidden ? 403 : 503, "기한관리 권한 또는 데이터 조회 상태를 확인해 주세요.");
    }
    return response.json();
  };
  const profiles = await db(`profiles?id=eq.${encodeURIComponent(user.id)}&select=role,status,must_change_password`);
  const profile = profiles[0];
  if (!profile || profile.status !== "approved" || !["admin", "staff"].includes(profile.role) || profile.must_change_password) throw new ApiError(403, "승인된 관리자·직원만 이용할 수 있습니다. 임시 비밀번호를 사용 중이면 먼저 변경해 주세요.");
  // The RPC enforces admin MFA and both global / per-company staff deadline permissions.
  // Keep the caller's JWT for every query so contact visibility also follows RLS.
  return db;
}

async function loadCompanies(db: Awaited<ReturnType<typeof authorize>>, today: string) {
  const rows: TermDeadline[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page: TermDeadline[] = await db(`rpc/list_upcoming_company_deadlines?offset=${offset}&limit=1000`, { method: "POST", body: "{}" });
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const grouped = new Map<string, NoticeCompany>();
  for (const row of rows.filter(r => isDueOfficer(r, today))) {
    const company = grouped.get(row.company_id) || { id: row.company_id, name: row.company_name, officers: [], contacts: [], revision: "" };
    company.officers.push(row);
    grouped.set(row.company_id, company);
  }
  const companies = [...grouped.values()];
  for (const company of companies) {
    company.officers.sort((a, b) => (a.target_date || "").localeCompare(b.target_date || "") || a.source_id.localeCompare(b.source_id));
    company.revision = digest([company.name, company.officers]);
  }
  companies.sort((a, b) => a.officers[0].target_date!.localeCompare(b.officers[0].target_date!) || a.name.localeCompare(b.name, "ko"));
  return {
    companies,
    unknownCount: new Set(rows.filter(r => r.source_type === "officer" && r.status === "active" && !r.target_date).map(r => r.company_id)).size,
    overdueCount: new Set(rows.filter(r => r.source_type === "officer" && r.status === "active" && r.target_date && r.target_date < today).map(r => r.company_id)).size,
  };
}

async function contactsFor(db: Awaited<ReturnType<typeof authorize>>, companyId: string): Promise<NoticeContact[]> {
  const result: NoticeContact[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page: NoticeContact[] = await db(`company_contacts?company_id=eq.${companyId}&contact_type=eq.email&select=id,value,label,contact_name,is_primary&order=is_primary.desc,id.asc&offset=${offset}&limit=1000`);
    result.push(...page.map(c => ({ ...c, value: c.value.trim() })).filter(c => validEmail(c.value)));
    if (page.length < 1000) break;
  }
  return result;
}

function fail(error: unknown) {
  if (error instanceof ApiError) return json({ message: error.message }, error.status);
  // Avoid logging tokens, contact details, or draft text.
  console.error("Term notice request failed");
  return json({ message: "처리 상태를 확인하지 못했습니다. 같은 내용으로 다시 시도해 주세요." }, 503);
}

export async function GET(request: Request) {
  try {
    const db = await authorize(request);
    const today = seoulToday();
    const data = await loadCompanies(db, today);
    // Limit parallel database requests when many companies are due.
    for (let i = 0; i < data.companies.length; i += 10) {
      await Promise.all(data.companies.slice(i, i + 10).map(async company => { company.contacts = await contactsFor(db, company.id); }));
    }
    return json({ ...data, today, endDate: addDays(today, 45) });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const db = await authorize(request);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ApiError(415, "지원하지 않는 요청 형식입니다.");
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "메일 내용을 확인해 주세요.");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 65_536) { await reader.cancel(); throw new ApiError(413, "메일 내용이 너무 깁니다."); }
      chunks.push(value);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new ApiError(400, "메일 내용을 확인해 주세요."); }
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!body || !uuid.test(body.companyId) || !uuid.test(body.contactId) || typeof body.revision !== "string" || typeof body.subject !== "string" || typeof body.text !== "string") throw new ApiError(400, "회사·수신자·메일 내용을 확인해 주세요.");
    const subject = body.subject.trim(), text = body.text.trim();
    if (!subject || subject.length > 200 || /[\r\n\x00-\x1f\x7f]/.test(subject) || !text || text.length > 10000 || text.includes("\0")) throw new ApiError(400, "제목은 한 줄 200자, 본문은 10,000자 이내로 작성해 주세요.");
    const { companies } = await loadCompanies(db, seoulToday());
    const company = companies.find(c => c.id === body.companyId);
    if (!company) throw new ApiError(403, "발송 가능한 담당 회사가 아니거나 45일 이내 만료 대상이 아닙니다.");
    if (company.revision !== body.revision) throw new ApiError(409, "임기 정보가 변경되었습니다. 목록을 새로고침한 후 문구를 다시 확인해 주세요.");
    const contact = (await contactsFor(db, company.id)).find(c => c.id === body.contactId);
    if (!contact) throw new ApiError(409, "저장된 이메일 연락처를 확인해 주세요. 목록을 새로고침해 주세요.");
    // Reject a changed address rather than sending a reviewed draft to an unseen recipient.
    if (contact.value !== body.recipient) throw new ApiError(409, "수신 주소가 변경되었습니다. 목록을 새로고침해 주세요.");
    if (!process.env.RESEND_API_KEY) throw new ApiError(503, "현재 메일 발송을 이용할 수 없습니다. 문구 복사를 이용해 주세요.");
    const payload = { from: "숲 법무사 사무소 <soop@sooplaw.com>", to: [contact.value], replyTo: "soop@sooplaw.com", subject, text };
    const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send(payload, { idempotencyKey: `term-notice/${digest([company.id, payload])}` });
    if (error || !data?.id) throw new ApiError(502, "메일 발송 접수를 확인하지 못했습니다. 같은 내용으로 다시 시도해 주세요.");
    return json({ message: "메일 서비스에 발송이 접수되었습니다. 실제 도착·열람 여부는 별도 확인이 필요합니다.", id: data.id });
  } catch (error) { return fail(error); }
}
