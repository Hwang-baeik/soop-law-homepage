import { createBot } from "../../../../lib/naverworks-bot";

export const maxDuration = 120;
const bot = createBot();

// Optional operator recovery endpoint. Not a browser/user-facing API.
export async function POST(request: Request) {
  if (!bot.authorizedRetry(request)) return new Response(null, { status: 401 });
  try {
    await bot.drain();
    return Response.json({ attempted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("naverworks_retry_failed");
    return Response.json({ error: "retry_failed" }, { status: 503 });
  }
}
