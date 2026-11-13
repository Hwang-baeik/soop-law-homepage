import { timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { createNoticeDraft, noticeSender, type TermDeadline } from "../../../../lib/term-notices";

export const runtime = "nodejs";
export const maxDuration = 120;

type Delivery = {
  delivery_key: string;
  company_name: string;
  recipient: string;
  officers: Pick<TermDeadline, "title" | "person_name" | "target_date">[];
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret || ""}`);
  if (!secret || authorization.length !== expected.length || !timingSafeEqual(authorization, expected)) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!url || !key || !resendKey) return Response.json({ message: "Unavailable" }, { status: 503 });

  async function rpc(name: string, args: Record<string, unknown>) {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: key!, "Content-Type": "application/json" },
      body: JSON.stringify({ p_secret: secret, ...args }),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Term notice database operation failed");
    return response.status === 204 ? null : response.json();
  }

  try {
    const deliveries: Delivery[] = await rpc("claim_automatic_term_notices", {});
    const resend = new Resend(resendKey);
    let accepted = 0;
    let unresolved = 0;
    for (const delivery of deliveries) {
      const draft = createNoticeDraft({ name: delivery.company_name, officers: delivery.officers });
      try {
        const { data, error } = await resend.emails.send({
          from: `숲 법무사 사무소 <${noticeSender}>`,
          replyTo: noticeSender,
          to: [delivery.recipient],
          ...draft,
        }, { idempotencyKey: `automatic-term-notice/${delivery.delivery_key}` });
        if (error || !data?.id) {
          // A definite rate-limit rejection can be retried. Keep uncertain attempts claimed.
          if (error?.statusCode === 429) await rpc("finish_automatic_term_notice", {
            p_key: delivery.delivery_key, p_provider_id: null, p_release: true,
          });
          unresolved++;
        } else {
          await rpc("finish_automatic_term_notice", {
            p_key: delivery.delivery_key, p_provider_id: data.id,
          });
          accepted++;
        }
      } catch {
        unresolved++;
      }
      // Keep the existing shared sender under the provider's request limit.
      await new Promise(resolve => setTimeout(resolve, 550));
    }
    return Response.json({ claimed: deliveries.length, accepted, unresolved }, { status: unresolved ? 502 : 200 });
  } catch {
    console.error("Automatic term notice run failed");
    return Response.json({ message: "Automatic run failed" }, { status: 503 });
  }
}
