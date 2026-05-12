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

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { message: "RESEND_API_KEY 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const body = (await request.json()) as ContactFormData;

    const email = body.email?.trim() ?? "";
    const nameOrCompany = body.nameOrCompany?.trim() ?? "";
    const category = body.category?.trim() ?? "";
    const message = body.message?.trim() ?? "";
    const agree = body.agree === true;

    if (!email || !nameOrCompany || !category || !message) {
      return NextResponse.json(
        { message: "필수 입력값이 누락되었습니다." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: "메일주소 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (!agree) {
      return NextResponse.json(
        { message: "개인정보 수집 및 이용 동의가 필요합니다." },
        { status: 400 }
      );
    }

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
      from: "숲 법무사 사무소 <onboarding@resend.dev>",
      to: ["soop_lawoffice@naver.com"],
      replyTo: email,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("Resend error:", error);
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