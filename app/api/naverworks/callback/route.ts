import { after } from "next/server";
import { BotError, createBot } from "../../../../lib/naverworks-bot";

export const maxDuration = 120;
const bot = createBot();

export async function POST(request: Request) {
  try {
    if (await bot.accept(request)) {
      after(async () => {
        try { await bot.drain(); }
        catch { console.error("naverworks_background_failed"); }
      });
    }
    return new Response(null, { status: 200 });
  } catch (error) {
    const status = error instanceof BotError ? error.status : 503;
    if (status >= 500) console.error("naverworks_callback_unavailable", { code: error instanceof BotError ? error.code : "unknown" });
    return Response.json({ error: status >= 500 ? "bot_unavailable" : (error as BotError).code }, { status });
  }
}
