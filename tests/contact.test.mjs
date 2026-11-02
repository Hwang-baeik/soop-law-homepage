import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

// Compile the actual TypeScript sources; only the framework and mail transport are stubbed.
const compile = async (path) => ts.transpileModule(await fs.readFile(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const validationUrl = moduleUrl(await compile('../lib/contact.ts'));
const { validateContact } = await import(validationUrl);
const valid = { email: 'test@example.com', nameOrCompany: '테스트 회사', category: '법인등기', message: '상담 내용', agree: true };

test('trims valid input and keeps multiline message', () => {
  const result = validateContact({ ...valid, nameOrCompany: ' 테스트 회사 ', message: ' 첫줄\n둘째줄 ' });
  assert.equal(result.data.nameOrCompany, '테스트 회사');
  assert.equal(result.data.message, '첫줄\n둘째줄');
});
for (const [label, body] of [
  ['null', null], ['array', []], ['string', 'input'], ['missing fields', {}],
  ['non-string email', { ...valid, email: 1 }],
  ['non-string name', { ...valid, nameOrCompany: {} }],
  ['whitespace', { ...valid, message: '  ' }],
  ['invalid email', { ...valid, email: 'broken' }],
  ['long email', { ...valid, email: 'a'.repeat(250) + '@example.com' }],
  ['long name', { ...valid, nameOrCompany: '가'.repeat(101) }],
  ['subject newline', { ...valid, nameOrCompany: '이름\n제목' }],
  ['unknown category', { ...valid, category: 'unlisted' }],
  ['long message', { ...valid, message: '가'.repeat(5001) }],
  ['no consent', { ...valid, agree: false }],
  ['string consent', { ...valid, agree: 'true' }],
]) test(`rejects ${label}`, () => assert.ok(validateContact(body).error));

test('allows exactly 5000 characters', () => assert.ok(validateContact({ ...valid, message: '가'.repeat(5000) }).data));

const { loadRoute, request: protectedRequest, state, cleanup } = await import('./form-test-helpers.mjs');
const { POST } = await loadRoute('../app/api/contact/route.ts');
const request = (body, contentType = 'application/json') => {
  let parsed;
  try { parsed = JSON.parse(body); } catch { return protectedRequest(body, { path: 'contact', type: contentType, raw: true }); }
  return protectedRequest(parsed, { path: 'contact', type: contentType });
};
test('returns 400 for malformed JSON', async () => assert.equal((await POST(request('{'))).status, 400));
test('returns 400 for null payload', async () => assert.equal((await POST(request('null'))).status, 400));
test('returns 415 for unsupported content type', async () => assert.equal((await POST(request('{}', 'text/plain'))).status, 415));
test('limits actual request bytes without Content-Length', async () => assert.equal((await POST(request('a'.repeat(32769)))).status, 413));
test('validates before checking mail configuration', async () => {
  delete process.env.RESEND_API_KEY;
  assert.equal((await POST(request('{}'))).status, 400);
  const response = await POST(request(JSON.stringify(valid)));
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('RESEND_API_KEY'));
  process.env.RESEND_API_KEY = 'test-only-never-real';
});
test('sends plain text and sets reply-to only for valid requests', async () => {
  state.accepted.clear();
  const response = await POST(request(JSON.stringify({ ...valid, message: '<script>alert("x")</script>' })));
  assert.equal(response.status, 200);
  assert.equal(state.accepted.size, 1);
  const mail = [...state.accepted.values()][0];
  assert.equal(mail.reply_to, valid.email);
  assert.ok(mail.text.includes('<script>'));
  assert.ok(!Object.hasOwn(mail, 'html'));
});
test('does not report success when mail provider rejects delivery', async () => {
  state.fail = true;
  assert.equal((await POST(request(JSON.stringify(valid)))).status, 503);
  state.fail = false;
});
test('existing contact rejects automated requests', async () => {
  state.bot = true;
  assert.equal((await POST(request(JSON.stringify(valid)))).status, 403);
  state.bot = false;
});
test.after(cleanup);