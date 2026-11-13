import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const compile = async (path, replacements = []) => {
  const source = ts.transpileModule(await readFile(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return moduleUrl(replacements.reduce((text, [from, to]) => text.replace(from, to), source));
};

const catalog = await compile("../lib/ksic-data.ts");
const ksic = await compile("../lib/ksic.ts", [['"./ksic-data"', JSON.stringify(catalog)]]);
const surveyModule = await compile("../lib/incorporation.ts", [['"./ksic"', JSON.stringify(ksic)]]);
const mail = await compile("../lib/office-mail.ts");
const { initialSurvey, surveyText, validateSurvey } = await import(surveyModule);
const { industryGroups, industryNames, matchesIndustry } = await import(ksic);
const route = await compile("../app/api/incorporation/route.ts", [
  ['"../../../lib/incorporation"', JSON.stringify(surveyModule)],
  ['"../../../lib/office-mail"', JSON.stringify(mail)],
  ['import { Resend } from "resend";', "class Resend { emails = { send: (...args) => globalThis.testSurveyMail(...args) }; }"],
]);
const { POST } = await import(route);
const example = () => {
  const empty = initialSurvey();
  return {
    ...empty, contactName: "담당자", email: "example@example.com", phone: "010-1234-5678",
    company: { ...empty.company, companyName: "새봄", address: "서울 성동구", englishName: "Saebom" },
    companyType: "주식회사", companyTypePosition: "상호 뒤", industryCodes: ["4791", "5822"], agree: true, authority: true,
  };
};

test("shows official four-digit codes and searches by colloquial term or detailed classification", () => {
  assert.equal(industryGroups.length, 21);
  assert.equal(industryNames.size, 501);
  const retail = industryGroups.find(group => group.code === "G").industries.find(entry => entry.code === "4791");
  assert.equal(retail.name, "통신 판매업");
  for (const query of ["쇼핑몰", "47912", "전자상거래 소매업", "통신판매업"]) {
    assert.ok(matchesIndustry(retail, query), query);
  }
  const software = industryGroups.find(group => group.code === "J").industries.find(entry => entry.code === "6201");
  assert.ok(matchesIndustry(software, "62010"));
});

test("accepts undecided fields and rejects fabricated codes, sensitive text and invalid share totals", () => {
  const survey = example();
  assert.match(surveyText(validateSurvey(survey)), /공고방법: 미정/);
  for (const change of [
    { industryCodes: ["9999"] },
    { industryCodes: ["47912"] },
    { notes: "９９０１０１–１２３４５６７" },
    { purposes: "비밀번호: secret" },
    { agree: false },
    { shareholders: [{ name: "주주", role: "주주", share: "70" }] },
    { companyTypePosition: "invalid" },
  ]) assert.throws(() => validateSurvey({ ...survey, ...change }));
  const sanitized = validateSurvey({ ...survey, officers: [{ role: "감사", name: "홍길동", share: "", birthDate: "1990-01-01" }] });
  assert.equal(Object.hasOwn(sanitized.officers[0], "birthDate"), false);
  assert.doesNotMatch(surveyText(sanitized), /1990-01-01/);
});

test("formats both Korean names in the selected order and preserves undecided values", () => {
  const survey = example();
  const company = { ...survey.company, alternateName: "새봄파트너스", address: "" };
  const formatted = changes => surveyText(validateSurvey({ ...survey, company, ...changes }));
  assert.match(formatted({}), /국문상호 \(1순위\): 새봄 주식회사\n/);
  assert.match(formatted({}), /국문상호 \(2순위, 선택\): 새봄파트너스 주식회사\n/);
  assert.match(formatted({ companyTypePosition: "상호 앞" }), /국문상호 \(1순위\): 주식회사 새봄\n/);
  assert.match(formatted({ companyTypePosition: undefined }), /국문상호 \(1순위\): 주식회사 새봄\n/);
  assert.match(formatted({ companyType: "미정" }), /국문상호 \(1순위\): 새봄\n/);
  assert.match(formatted({ company: { ...company, companyName: "" } }), /국문상호 \(1순위\): 미정\n/);
  assert.match(formatted({}), /영문상호 \(선택\): Saebom\n/);
});

test("checks request protections and sends only organized mail to the office", async () => {
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "test-only";
  const sent = [];
  let providerError = false;
  globalThis.testSurveyMail = async (payload, options) => {
    sent.push({ payload, options });
    return providerError ? { error: { name: "test" } } : { data: { id: "test-id" } };
  };
  const request = (body, headers = {}) => new Request("https://sooplaw.com/api/incorporation", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://sooplaw.com", "x-vercel-forwarded-for": "192.0.2.1", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  try {
    const survey = example();
    assert.equal((await POST(request({ survey, website: "" }, { origin: "https://other.example" }))).status, 403);
    assert.equal((await POST(request({ survey, website: "spam" }))).status, 400);
    assert.equal((await POST(request("x".repeat(49153)))).status, 413);
    assert.equal(sent.length, 0);
    const payload = { survey, website: "" };
    const first = await POST(request(payload, { host: "127.0.0.1:3047", origin: "http://127.0.0.1:3047", "x-forwarded-proto": "http" }));
    assert.equal(first.status, 200);
    const { receipt } = await first.json();
    assert.match(receipt, /^SOOP-[0-9A-F]{12}$/);
    assert.deepEqual(sent[0].payload.to, ["soop@sooplaw.com"]);
    assert.equal(sent[0].payload.replyTo, survey.email);
    assert.match(sent[0].payload.text, /\[4791\] 통신 판매업/);
    assert.match(sent[0].payload.text, /국문상호 \(1순위\): 새봄 주식회사\n/);
    assert.doesNotMatch(sent[0].payload.text, /동일상호/);
    assert.match(sent[0].payload.text, new RegExp(receipt));
    providerError = true;
    assert.equal((await POST(request(payload))).status, 503);
    assert.equal(sent[1].options.idempotencyKey, sent[0].options.idempotencyKey);
    for (let i = 0; i < 8; i++) assert.equal((await POST(request({ survey, website: "spam" }))).status, 400);
    const limited = await POST(request(payload));
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
  } finally {
    delete globalThis.testSurveyMail;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  }
});
