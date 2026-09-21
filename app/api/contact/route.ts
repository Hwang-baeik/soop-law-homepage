import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContactFormData = {
  email?: string;
  nameOrCompany?: string;
  category?: string;
  message?: string;
  agree?: boolean;
};

const LIMITS = { email: 254, nameOrCompany: 120, category: 60, message: 5000 } as const;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try { return new URL(origin).host === host; }
  catch { return false; }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ message: "올바른 요청 형식이 아닙니다." }, { status: 415 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Contact API: RESEND_API_KEY is not configured");
      return NextResponse.json({ message: "현재 상담 접수 서비스 설정을 확인하고 있습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    }

    const body = (await request.json()) as ContactFormData;
    const email = body.email?.trim() ?? "";
    const nameOrCompany = body.nameOrCompany?.trim() ?? "";
    const category = body.category?.trim() ?? "";
    const message = body.message?.trim() ?? "";
    const agree = body.agree === true;

    if (!email || !nameOrCompany || !category || !message) {
      return NextResponse.json({ message: "필수 입력값이 누락되었습니다." }, { status: 400 });
    }
    if (email.length > LIMITS.email || nameOrCompany.length > LIMITS.nameOrCompany || category.length > LIMITS.category || message.length > LIMITS.message) {
      return NextResponse.json({ message: "입력 내용이 허용된 길이를 초과했습니다." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ message: "메일주소 형식이 올바르지 않습니다." }, { status: 400 });
    }
    if (!agree) {
      return NextResponse.json({ message: "개인정보 수집 및 이용 동의가 필요합니다." }, { status: 400 });
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
      console.error("Resend error:", error);
      return NextResponse.json({ message: "메일 발송에 실패했습니다." }, { status: 502 });
    }

    return NextResponse.json({ message: "상담 신청이 정상적으로 접수되었습니다." }, { status: 200 });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json({ message: "서버 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
