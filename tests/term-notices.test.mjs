import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const compile = async path => ts.transpileModule(await fs.readFile(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const helpersUrl = moduleUrl(await compile('../lib/term-notices.ts'));
const { seoulToday, addDays, isDueOfficer, validEmail, createNoticeDraft } = await import(helpersUrl);
const today = seoulToday();
const companyId = '11111111-1111-4111-8111-111111111111';
const contactId = '22222222-2222-4222-8222-222222222222';
const officer = { source_type: 'officer', source_id: 'officer-1', company_id: companyId, company_name: '테스트 법인', title: '대표이사', person_name: '테스트', target_date: addDays(today, 10), status: 'active', details: {} };
const contact = { id: contactId, value: 'stored@example.com', label: '대표', contact_name: null, is_primary: true };

test('Seoul business date changes at 15:00 UTC', () => {
  assert.equal(seoulToday(new Date('2026-10-19T14:59:59Z')), '2026-10-19');
  assert.equal(seoulToday(new Date('2026-10-19T15:00:00Z')), '2026-10-20');
});
test('45-day inclusive window excludes overdue, day 46, unknown dates and inactive/non-officers', () => {
  for (const days of [0, 1, 45]) assert.equal(isDueOfficer({ ...officer, target_date: addDays(today, days) }, today), true);
  for (const days of [-1, 46]) assert.equal(isDueOfficer({ ...officer, target_date: addDays(today, days) }, today), false);
  assert.equal(isDueOfficer({ ...officer, target_date: null }, today), false);
  assert.equal(isDueOfficer({ ...officer, status: 'renewed' }, today), false);
  assert.equal(isDueOfficer({ ...officer, source_type: 'term_item' }, today), false);
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});
test('draft contains every due officer and editable neutral guidance', () => {
  const draft = createNoticeDraft({ name: '테스트 법인', officers: [officer, { ...officer, title: '감사', person_name: '다른임원' }] });
  assert.match(draft.subject, /테스트 법인/);
  assert.match(draft.text, /대표이사 테스트/);
  assert.match(draft.text, /감사 다른임원/);
  assert.match(draft.text, /soop@sooplaw.com/);
});
test('only one valid email address is accepted', () => {
  assert.equal(validEmail('ok@example.com'), true);
  for (const value of ['a@example.com,b@example.com', 'name <a@example.com>', 'a@example.com\nBcc:x@y.com', 'invalid', 'a'.repeat(255) + '@x.com']) assert.equal(validEmail(value), false);
});

const routeSource = (await compile('../app/api/term-notices/route.ts'))
  .replace(/import .* from "resend";/, 'class Resend { emails = { send: (...args) => globalThis.__noticeSend(...args) }; }')
  .replace('"../../../lib/term-notices"', JSON.stringify(helpersUrl));
const { GET, POST } = await import(moduleUrl(routeSource));
const originalFetch = globalThis.fetch;
const originalEnv = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, mail: process.env.RESEND_API_KEY };
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-public';
process.env.RESEND_API_KEY = 'test-mail';
let role, status, mustChange, authStatus, rpcDenied, rows, contacts, sent, providerError, queries;
test.beforeEach(() => {
  role = 'admin'; status = 'approved'; mustChange = false; authStatus = 200; rpcDenied = false;
  rows = [officer]; contacts = [contact]; sent = []; providerError = false; queries = [];
  globalThis.__noticeSend = async (payload, options) => { sent.push({ payload, options }); return providerError ? { error: { name: 'failure' } } : { data: { id: 'provider-accepted-id' }, error: null }; };
  globalThis.fetch = async (url, init) => {
    queries.push({ url, init });
    assert.equal(init.headers.Authorization, 'Bearer valid-token');
    assert.equal(init.cache, 'no-store');
    if (url.includes('/auth/v1/user')) return Response.json({ id: 'fixture-user' }, { status: authStatus });
    if (url.includes('/profiles?')) return Response.json([{ role, status, must_change_password: mustChange }]);
    if (url.includes('/rpc/')) return rpcDenied ? Response.json({ message: 'not authorized' }, { status: 400 }) : Response.json(rows);
    if (url.includes('/company_contacts?')) return Response.json(contacts);
    throw new Error('Unexpected URL');
  };
});
const request = (body, token = 'valid-token', contentType = 'application/json') => new Request('https://sooplaw.com/api/term-notices', {
  method: body === undefined ? 'GET' : 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': contentType }, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
});
const validBody = async () => {
  const response = await GET(request());
  assert.equal(response.status, 200);
  const { companies } = await response.json();
  return { companyId, contactId, recipient: contact.value, revision: companies[0].revision, subject: '임기 만료 안내', text: '검토된 안내 내용' };
};
test('anonymous and invalid sessions cannot query or send', async () => {
  assert.equal((await GET(request(undefined, ''))).status, 401);
  assert.equal((await POST(request({}, ''))).status, 401);
  authStatus = 401;
  assert.equal((await GET(request())).status, 401);
  assert.equal(sent.length, 0);
});
test('clients, pending/suspended and temporary-password accounts cannot send', async () => {
  for (const value of ['client', 'staff']) {
    role = value; status = value === 'client' ? 'approved' : 'pending';
    assert.equal((await POST(request({}))).status, 403);
  }
  role = 'admin'; status = 'suspended';
  assert.equal((await GET(request())).status, 403);
  status = 'approved'; mustChange = true;
  assert.equal((await GET(request())).status, 403);
});
test('database denial including missing MFA/deadline rights stops all mail', async () => {
  rpcDenied = true;
  assert.equal((await GET(request())).status, 403);
  assert.equal((await POST(request({ companyId, contactId, revision: 'x', subject: 'a', text: 'b' }))).status, 403);
  assert.equal(sent.length, 0);
});
test('groups multiple officers by company; keeps unknown and overdue separate', async () => {
  rows = [officer, { ...officer, source_id: 'officer-2' }, { ...officer, source_id: 'unknown', target_date: null }, { ...officer, source_id: 'overdue', target_date: addDays(today, -1) }];
  const data = await (await GET(request())).json();
  assert.equal(data.companies.length, 1);
  assert.equal(data.companies[0].officers.length, 2);
  assert.equal(data.unknownCount, 1);
  assert.equal(data.overdueCount, 1);
  assert.equal(data.endDate, addDays(today, 45));
});
test('missing and malformed email contacts allow drafting but prevent send', async () => {
  const body = await validBody();
  contacts = [{ ...contact, value: 'bad@example.com,other@example.com' }];
  assert.equal((await (await GET(request())).json()).companies[0].contacts.length, 0);
  assert.equal((await POST(request(body))).status, 409);
  assert.equal(sent.length, 0);
});
test('cross-company and stale due officer data are rejected', async () => {
  const body = await validBody();
  assert.equal((await POST(request({ ...body, companyId: '33333333-3333-4333-8333-333333333333' }))).status, 403);
  rows = [{ ...officer, target_date: addDays(today, 11) }];
  assert.equal((await POST(request(body))).status, 409);
  rows = [];
  assert.equal((await POST(request(body))).status, 403);
  assert.equal(sent.length, 0);
});
test('changed/deleted recipient and arbitrary recipient spoofing cannot send', async () => {
  const body = await validBody();
  assert.equal((await POST(request({ ...body, recipient: 'attacker@example.com' }))).status, 409);
  contacts = [{ ...contact, value: 'changed@example.com' }];
  assert.equal((await POST(request(body))).status, 409);
  contacts = [];
  assert.equal((await POST(request(body))).status, 409);
  assert.equal(sent.length, 0);
});
test('malformed, oversized and header-injection payloads fail before sending', async () => {
  const body = await validBody();
  assert.equal((await POST(request('{'))).status, 400);
  assert.equal((await POST(request('x'.repeat(65537)))).status, 413);
  assert.equal((await POST(request(body, 'valid-token', 'text/plain'))).status, 415);
  for (const patch of [{ subject: 'hello\nBcc: hidden@a.com' }, { text: '' }, { text: 'x'.repeat(10001) }, { contactId: 'x&select=*' }]) assert.equal((await POST(request({ ...body, ...patch }))).status, 400);
  assert.equal(sent.length, 0);
});
test('staff sends only to server-loaded recipient, fixed sender and reply-to; retry uses stable idempotency key', async () => {
  role = 'staff';
  const body = await validBody();
  for (let n = 0; n < 2; n++) assert.equal((await POST(request({ ...body, from: 'spoof@example.com', to: ['spoof@example.com'] }))).status, 200);
  assert.equal(sent[0].payload.from, '숲 법무사 사무소 <soop@sooplaw.com>');
  assert.equal(sent[0].payload.replyTo, 'soop@sooplaw.com');
  assert.deepEqual(sent[0].payload.to, ['stored@example.com']);
  assert.equal(sent[0].options.idempotencyKey, sent[1].options.idempotencyKey);
  assert.equal(sent[0].payload.html, undefined);
});
test('provider failures and missing configuration never report success', async () => {
  const body = await validBody();
  providerError = true;
  assert.equal((await POST(request(body))).status, 502);
  delete process.env.RESEND_API_KEY;
  assert.equal((await POST(request(body))).status, 503);
  process.env.RESEND_API_KEY = 'test-mail';
});
test.after(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.__noticeSend;
  for (const [name, value] of [['NEXT_PUBLIC_SUPABASE_URL', originalEnv.url], ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', originalEnv.key], ['RESEND_API_KEY', originalEnv.mail]]) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});
