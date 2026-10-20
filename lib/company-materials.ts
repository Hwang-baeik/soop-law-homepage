export const MATERIAL_LABELS = { articles: "정관", shareholder_register: "주주명부" } as const;
export type MaterialType = keyof typeof MATERIAL_LABELS;
export type HoldingStatus = "unknown" | "held" | "not_held";
export const HOLDING_LABELS: Record<HoldingStatus, string> = { unknown: "확인 필요", held: "사무소 보관 중", not_held: "사무소 미보관" };
export type MaterialHoldings = { articles_status: HoldingStatus; shareholder_register_status: HoldingStatus; checked_at: string | null };
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateMaterialRequest(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("요청 내용을 확인해 주세요.");
  const b = body as Record<string, unknown>;
  if (typeof b.companyId !== "string" || !UUID.test(b.companyId) || typeof b.requestId !== "string" || !UUID.test(b.requestId)) throw new Error("회사와 요청번호를 확인해 주세요.");
  if (typeof b.replyEmail !== "string") throw new Error("회신받을 이메일 주소를 입력해 주세요.");
  const replyEmail = b.replyEmail.trim();
  if (replyEmail.length > 254 || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(replyEmail)) throw new Error("회신받을 이메일 주소를 하나만 정확히 입력해 주세요.");
  if (!Array.isArray(b.types) || b.types.length < 1 || b.types.length > 2 || b.types.some(t => typeof t !== "string" || !Object.hasOwn(MATERIAL_LABELS, t)) || new Set(b.types).size !== b.types.length) throw new Error("정관·주주명부 중 요청할 자료를 선택해 주세요.");
  return { companyId: b.companyId, requestId: b.requestId, replyEmail, types: [...b.types].sort() as MaterialType[] };
}
export function isHoldingStatus(value: unknown): value is HoldingStatus { return value === "unknown" || value === "held" || value === "not_held"; }
