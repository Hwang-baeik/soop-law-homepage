import { createHash, createHmac, sign, timingSafeEqual } from "node:crypto";

export const RULES = [
  ["#안내완료", "정보 취합 후 서류작성 해야합니다."],
  ["#서류작성완료", "날인 및 접수준비를 해야합니다."],
  ["#비용확인", "비용이 확인되었습니다."],
  ["#접수완료", "완료, 보정 등 대기 중입니다."],
  ["#등기완료", "등기완료서류 준비를 해야합니다."],
  ["#완료서류발송", "업무 정리를 해야합니다."],
] as const;
export const WELCOME = "업무 안내 봇입니다. 아래 키워드가 포함된 메시지를 보내면 다음 할 일을 안내합니다.\n\n"
  + RULES.map(([keyword, reply]) => `${keyword}\n→ ${reply}`).join("\n\n")
  + "\n\n이 안내는 대화방별 최초 1회만 발송합니다.";

type Environment = Record<string, string | undefined>;
type Event = { type: string; issuedTime: string; source: { channelId?: string; userId?: string }; content?: { type?: string; text?: string } };
type Job = { channelId: string; text: string; kind: "welcome" | "message"; status: "pending" | "sending" | "sent" | "uncertain" };
export class BotError extends Error {
  constructor(public code: string, public status = 503) { super(code); }
}
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export function validSignature(raw: Uint8Array, signature: string, secret: string) {
  return safeEqual(createHmac("sha256", secret).update(raw).digest("base64"), signature);
}

// Queue writes and claims are atomic across concurrent Vercel instances.
const ENQUEUE = `if not redis.call('GET',KEYS[1]) then
  redis.call('SET',KEYS[1],ARGV[1]); if tonumber(ARGV[2])>0 then redis.call('EXPIRE',KEYS[1],ARGV[2]) end
  redis.call('ZADD',KEYS[2],ARGV[3],KEYS[1]); return 1 end return 0`;
const CLAIM = `local raw=redis.call('GET',KEYS[1]); if not raw then redis.call('ZREM',KEYS[2],KEYS[1]); return false end
  local job=cjson.decode(raw); if job.status~='pending' then redis.call('ZREM',KEYS[2],KEYS[1]); return false end
  job.status='sending'; redis.call('SET',KEYS[1],cjson.encode(job));
  if job.kind=='message' then redis.call('EXPIRE',KEYS[1],86400) end
  redis.call('ZREM',KEYS[2],KEYS[1]); return raw`;
const FINISH = `redis.call('SET',KEYS[1],ARGV[1]); if tonumber(ARGV[2])>0 then redis.call('EXPIRE',KEYS[1],ARGV[2]) end
  if ARGV[3]=='pending' then redis.call('ZADD',KEYS[2],ARGV[4],KEYS[1]) end return 1`;

export function createBot(env: Environment = process.env, http: typeof fetch = fetch, now = Date.now) {
  function required(name: string) {
    const aliases: Record<string, string> = {
      UPSTASH_REDIS_REST_URL: "KV_REST_API_URL",
      UPSTASH_REDIS_REST_TOKEN: "KV_REST_API_TOKEN",
    };
    const value = env[name] || env[aliases[name]];
    if (!value) throw new BotError(`missing_${name}`);
    return value;
  }
  const prefix = () => `naverworks:${required("NAVERWORKS_BOT_ID")}:`;
  const queue = () => `${prefix()}pending`;
  async function redis(command: (string | number)[]) {
    const response = await http(required("UPSTASH_REDIS_REST_URL"), {
      method: "POST", headers: { Authorization: `Bearer ${required("UPSTASH_REDIS_REST_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify(command), signal: AbortSignal.timeout(5000), cache: "no-store",
    });
    if (!response.ok) throw new BotError("storage_unavailable");
    const result = await response.json();
    if (result.error) throw new BotError("storage_command_failed");
    return result.result;
  }
  function deliveryConfig() {
    for (const key of ["NAVERWORKS_CLIENT_ID", "NAVERWORKS_CLIENT_SECRET", "NAVERWORKS_SERVICE_ACCOUNT", "NAVERWORKS_PRIVATE_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) required(key);
  }
  let token: { value: string; until: number } | undefined;
  async function accessToken() {
    if (token && token.until > now()) return token.value;
    const issued = Math.floor(now() / 1000);
    const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const payload = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: required("NAVERWORKS_CLIENT_ID"), sub: required("NAVERWORKS_SERVICE_ACCOUNT"), iat: issued, exp: issued + 300 })}`;
    const assertion = `${payload}.${sign("RSA-SHA256", Buffer.from(payload), required("NAVERWORKS_PRIVATE_KEY").replace(/\\n/g, "\n")).toString("base64url")}`;
    const response = await http("https://auth.worksmobile.com/oauth2/v2.0/token", {
      method: "POST", body: new URLSearchParams({ assertion, grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", client_id: required("NAVERWORKS_CLIENT_ID"), client_secret: required("NAVERWORKS_CLIENT_SECRET"), scope: "bot.message" }),
      signal: AbortSignal.timeout(8000), cache: "no-store",
    });
    if (!response.ok) throw new BotError("token_request_failed");
    const data = await response.json();
    if (typeof data.access_token !== "string" || !Number.isFinite(Number(data.expires_in)) || Number(data.expires_in) <= 0) throw new BotError("invalid_token_response");
    token = { value: data.access_token, until: now() + Math.max(0, Number(data.expires_in) - 60) * 1000 };
    return token.value;
  }
  async function accept(request: Request) {
    if (request.headers.get("x-works-botid") !== required("NAVERWORKS_BOT_ID")) throw new BotError("invalid_bot", 401);
    if (Number(request.headers.get("content-length")) > 65536) throw new BotError("body_too_large", 413);
    const reader = request.body?.getReader();
    if (!reader) throw new BotError("missing_body", 400);
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 65536) { await reader.cancel(); throw new BotError("body_too_large", 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const raw = Buffer.concat(chunks);
    if (!validSignature(raw, request.headers.get("x-works-signature") || "", required("NAVERWORKS_BOT_SECRET"))) throw new BotError("invalid_signature", 401);
    let event: Event;
    try { event = JSON.parse(raw.toString("utf8")); } catch { throw new BotError("invalid_json", 400); }
    if (!event || typeof event !== "object" || !event.source || typeof event.source !== "object") throw new BotError("invalid_event", 400);
    const timestamp = Date.parse(event.issuedTime);
    if (!Number.isFinite(timestamp) || Math.abs(now() - timestamp) > 10 * 60 * 1000) throw new BotError("expired_event", 400);
    const channelId = event.source.channelId;
    if (typeof channelId !== "string" || !channelId || channelId.length > 256) return false;
    const actions: Job[] = [];
    if (event.type === "join") actions.push({ channelId, text: WELCOME, kind: "welcome", status: "pending" });
    if (event.type === "message" && typeof event.source.userId === "string" && event.source.userId !== env.NAVERWORKS_BOT_ID && event.content?.type === "text" && typeof event.content.text === "string") {
      const hashtags = new Map<string, string>();
      for (const [, date, keyword] of event.content.text.matchAll(/(?:(?<![\p{L}\p{M}\p{N}_-])(\d{4}-\d{2}-\d{2})[ \t]+)?(#[\p{L}\p{M}\p{N}_]+)/gu)) {
        if (!hashtags.get(keyword)) hashtags.set(keyword, date ?? "");
      }
      for (const [keyword, reply] of RULES) {
        const date = hashtags.get(keyword);
        if (date === undefined) continue;
        const text = date ? `${date} ${keyword} · ${reply}` : reply;
        actions.push({ channelId, text, kind: "message", status: "pending" });
      }
    }
    if (!actions.length) return false;
    deliveryConfig();
    for (const action of actions) {
      const id = action.kind === "welcome" ? `welcome:${hash(channelId)}` : `event:${hash(JSON.stringify(event) + action.text)}`;
      await redis(["EVAL", ENQUEUE, 2, prefix() + id, queue(), JSON.stringify(action), action.kind === "welcome" ? 0 : 86400, now()]);
    }
    return true;
  }
  async function drain() {
    // Acquire credentials before claiming jobs: authentication outages remain recoverable.
    const jobs = await redis(["ZRANGE", queue(), 0, RULES.length - 1]) as string[];
    if (!jobs.length) return;
    const bearer = await accessToken();
    for (const key of jobs) {
      const raw = await redis(["EVAL", CLAIM, 2, key, queue()]);
      if (!raw) continue;
      const job = JSON.parse(raw) as Job;
      let state: Job["status"] = "uncertain";
      try {
        const response = await http(`https://www.worksapis.com/v1.0/bots/${encodeURIComponent(required("NAVERWORKS_BOT_ID"))}/channels/${encodeURIComponent(job.channelId)}/messages`, {
          method: "POST", headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
          body: JSON.stringify({ content: { type: "text", text: job.text } }), signal: AbortSignal.timeout(10000), cache: "no-store",
        });
        state = response.ok ? "sent" : response.status >= 500 ? "uncertain" : "pending";
        if (response.status === 401) token = undefined;
        if (!response.ok) console.error("naverworks_delivery_rejected", { job: hash(key), status: response.status });
      } catch {
        // The remote server may have accepted a timed-out request. Never resend blindly.
        console.error("naverworks_delivery_uncertain", { job: hash(key) });
      }
      await redis(["EVAL", FINISH, 2, key, queue(), JSON.stringify({ ...job, status: state }), job.kind === "welcome" ? 0 : 86400, state, now()]);
      if (state === "sent") console.info("naverworks_delivery_sent", { job: hash(key), kind: job.kind });
    }
  }
  function authorizedRetry(request: Request) {
    return !!env.NAVERWORKS_RETRY_SECRET && safeEqual(request.headers.get("authorization") || "", `Bearer ${env.NAVERWORKS_RETRY_SECRET}`);
  }
  return { accept, drain, authorizedRetry };
}
