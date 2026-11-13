import { createBot } from "../../../../lib/naverworks-bot";

export const maxDuration = 120;
const bot = createBot();
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (!bot.authorizedChannelSync(request)) return new Response(null, { status: 401, headers });
  try {
    return Response.json({ channelIds: await bot.channelIds() }, { headers });
  } catch {
    console.error("naverworks_channel_registry_unavailable");
    return Response.json({ error: "channel_registry_unavailable" }, { status: 503, headers });
  }
}
