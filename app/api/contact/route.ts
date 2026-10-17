import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { validateContact } from "../../../lib/contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json({ message: "지원하지 않는 요청 형식입니다." }, { status: 415 });
    }
    // Read with an actual byte limit, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ message: "신청 내용이 비어 있습니다." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32_768) {
        await reader.cancel();
        return NextResponse.json({ message: "입력 내용이 너무 깁니다." }, { status: 413 });
      }
      chunks.push(value);
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return NextResponse.json({ message: "상담 신청 내용을 확인해 주세요." }, { status: 400 });
    }
    const validated = validateContact(body);
    if (validated.error) return NextResponse.json({ message: validated.error }, { status: 400 });
    const { email, nameOrCompany, category, message } = validated.data;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { message: "현재 온라인 접수를 이용할 수 없습니다. 전화 02-6956-8683 또는 soop@sooplaw.com으로 문의해 주세요." },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);

    const subject = `[홈페이지문의]_${nameOrCompany}_${category}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #222;">
        <h2>홈페이지 상담 문의</h2>
        <p><strong>메일주소:</strong> ${escapeHtml(email)}</p>
        <p><strong>성명(법인명):</strong> ${escapeHtml(nameOrCompany)}</p>
        <p><strong>업무 분류:</strong> ${escapeHtml(category)}</p>
        <p><strong>개인정보 동의:</strong> 동의함</p>
        <hr />
        <h3>문의 내용</h3>
        <div style="white-space: pre-wrap;">${escapeHtml(message)}</div>
      </div>
    `;

    const text = `
홈페이지 상담 문의

메일주소: ${email}
성명(법인명): ${nameOrCompany}
업무 분류: ${category}
개인정보 동의: 동의함

문의 내용:
${message}
    `.trim();

    const { error } = await resend.emails.send({
      from: "숲 법무사 사무소 <contact@sooplaw.com>",
      to: ["soop@sooplaw.com"],
      replyTo: email,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("Contact mail delivery failed:", error.name);
      return NextResponse.json(
        { message: "메일 발송에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "상담 신청이 정상적으로 접수되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { message: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
