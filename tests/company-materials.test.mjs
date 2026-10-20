import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const compile = async path => ts.transpileModule(await fs.readFile(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const helperUrl = moduleUrl(await compile('../lib/company-materials.ts'));
const { validateMaterialRequest } = await import(helperUrl);
const companyId = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';
const valid = () => ({ companyId, requestId, replyEmail: 'reply@example.com', types: ['articles','shareholder_register'] });
test('material requests allow only named documents, one email and valid identifiers', () => {
  assert.deepEqual(validateMaterialRequest({ ...valid(), replyEmail: ' reply@example.com ' }), valid());
  for (const body of [null, [], 'text', {}, { ...valid(), companyId: 'invalid' }, { ...valid(), requestId: null }, { ...valid(), replyEmail: 'x@y.com\nBcc:z@a.com' }, { ...valid(), replyEmail: 'a@b.com,c@d.com' }, { ...valid(), types: [] }, { ...valid(), types: ['registry'] }, { ...valid(), types: ['__proto__'] }, { ...valid(), types: ['constructor'] }, { ...valid(), types: ['articles','articles'] }]) assert.throws(() => validateMaterialRequest(body));
});
const routeSource = (await compile('../app/api/company-materials/route.ts'))
  .replace(/import .* from "resend";/, 'class Resend { emails = { send: (...args) => globalThis.__materialsSend(...args) }; }')
  .replace('"../../../lib/company-materials"', JSON.stringify(helperUrl));
const { GET, POST, PATCH } = await import(moduleUrl(routeSource));
const originalFetch = globalThis.fetch;
const env = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, mail: process.env.RESEND_API_KEY };
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-public';
process.env.RESEND_API_KEY = 'test-mail';
let profile, canManage, canRequest, hasCompany, sent, queries, registerError, providerError, authStatus, createdAt;
test.beforeEach(() => {
  profile = { role: 'client', status: 'approved', must_change_password: false, display_name: '요청자' };
  canManage = false; canRequest = true; hasCompany = true; sent = []; queries = []; registerError = null; providerError = false; authStatus = 200; createdAt = new Date().toISOString();
  globalThis.__materialsSend = async (payload, options) => { sent.push({ payload, options }); return providerError ? { error: { name: 'failure' } } : { data: { id: 'accepted' }, error: null }; };
  globalThis.fetch = async (url, init) => {
    queries.push({ url, init });
    assert.equal(init.headers.Authorization, 'Bearer valid-token');
    assert.equal(init.cache, 'no-store');
    if (url.includes('/auth/v1/user')) return Response.json({ id: 'fixture-user', email: 'login@example.com' }, { status: authStatus });
    if (url.includes('/profiles?')) return Response.json([profile]);
    if (url.includes('/companies?')) return Response.json(hasCompany ? [{ id: companyId, name: '회사명', corporate_registration_number: '1234567890123' }] : []);
    if (url.includes('/rpc/can_manage_company_materials')) return Response.json(canManage);
    if (url.includes('/rpc/can_request_company_materials')) return Response.json(canRequest);
    if (url.includes('/rpc/register_company_material_request')) return registerError ? Response.json(registerError, { status: 400 }) : Response.json({ id: requestId, created_at: createdAt });
    if (url.includes('/company_material_holdings?')) return init.method === 'POST' ? new Response(null, { status: 204 }) : Response.json([]);
    throw new Error('Unexpected URL: ' + url);
  };
});
test.afterEach(() => { globalThis.fetch = originalFetch; process.env.RESEND_API_KEY = 'test-mail'; });
test.after(() => {
  for (const [name,value] of [['NEXT_PUBLIC_SUPABASE_URL',env.url],['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',env.key],['RESEND_API_KEY',env.mail]]) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  delete globalThis.__materialsSend;
});
const request = (method, body, token = 'valid-token', contentType = 'application/json') => new Request(`https://sooplaw.com/api/company-materials?companyId=${companyId}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': contentType }, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
test('anonymous and invalid sessions cannot read or request', async () => {
  assert.equal((await GET(request('GET', undefined, ''))).status, 401);
  assert.equal((await POST(request('POST', valid(), ''))).status, 401);
  authStatus = 401; assert.equal((await POST(request('POST', valid()))).status, 401);
  assert.equal(sent.length, 0);
});
test('unapproved, suspended and temporary-password accounts are blocked', async () => {
  for (const status of ['pending','suspended','rejected']) { profile.status = status; assert.equal((await POST(request('POST',valid()))).status,403); }
  profile.status='approved'; profile.must_change_password=true;
  assert.equal((await GET(request('GET'))).status,403); assert.equal(sent.length,0);
});
test('unlinked company and missing material request rights cannot send', async () => {
  hasCompany=false; assert.equal((await POST(request('POST',valid()))).status,403);
  hasCompany=true; canRequest=false; assert.equal((await POST(request('POST',valid()))).status,403);
  assert.equal(sent.length,0);
});
test('missing holdings are unknown rather than falsely held or not held', async () => {
  const response=await GET(request('GET')); assert.equal(response.status,200);
  const data=await response.json(); assert.equal(data.holdings.articles_status,'unknown'); assert.equal(data.holdings.shareholder_register_status,'unknown'); assert.equal(data.holdings.checked_at,null);
});
test('members cannot edit holdings; authorized internal users can save supported statuses', async () => {
  const update={ companyId, articlesStatus:'held', shareholderRegisterStatus:'not_held' };
  assert.equal((await PATCH(request('PATCH',update))).status,403);
  canManage=true; profile.role='staff';
  assert.equal((await PATCH(request('PATCH',{...update,articlesStatus:'unexpected'}))).status,400);
  assert.equal((await PATCH(request('PATCH',update))).status,200);
  const write=queries.find(q=>q.url.includes('/company_material_holdings?')&&q.init.method==='POST');
  assert.deepEqual(JSON.parse(write.init.body),{company_id:companyId,articles_status:'held',shareholder_register_status:'not_held'});
});
test('malformed, oversized and forged document or email inputs never send', async () => {
  assert.equal((await POST(request('POST','{'))).status,400);
  assert.equal((await POST(request('POST','x'.repeat(5000)))).status,413);
  assert.equal((await POST(request('POST',valid(),'valid-token','text/plain'))).status,415);
  for(const body of [{...valid(),types:['registry']},{...valid(),replyEmail:'x@y.com\nBcc:z@a.com'}]) assert.equal((await POST(request('POST',body))).status,400);
  assert.equal(sent.length,0);
});
test('database rechecks access; rate cap and retry conflicts stop email', async () => {
  for (const [detail,expected] of [[{code:'42501',message:'not authorized'},403],[{code:'P0001',message:'material request rate limit'},429],[{code:'P0001',message:'material request conflict'},409]]) { registerError=detail; assert.equal((await POST(request('POST',valid()))).status,expected); }
  assert.equal(sent.length,0);
});
test('fixed office recipient, editable reply address and no attachments; stable retry id', async () => {
  const body={...valid(),to:'attacker@example.com',from:'attacker@example.com',companyName:'spoofed'};
  assert.equal((await POST(request('POST',body))).status,200);
  assert.equal((await POST(request('POST',body))).status,200);
  const {payload,options}=sent[0]; assert.deepEqual(payload.to,['soop@sooplaw.com']); assert.equal(payload.from,'숲 법무사 사무소 <soop@sooplaw.com>'); assert.equal(payload.replyTo,'reply@example.com'); assert.equal(payload.attachments,undefined);
  assert.match(payload.text,/주주명부/); assert.match(payload.text,/인증된 수신 주소를 의미하지 않습니다/); assert.doesNotMatch(payload.subject,/spoofed/);
  assert.equal(options.idempotencyKey,`company-material/${requestId}`); assert.deepEqual(options,sent[1].options);
});
test('old retries, missing mail configuration and provider failures do not claim success', async () => {
  createdAt = new Date(Date.now()-24*60*60*1000).toISOString(); assert.equal((await POST(request('POST',valid()))).status,409); assert.equal(sent.length,0);
  createdAt=new Date().toISOString(); delete process.env.RESEND_API_KEY; assert.equal((await POST(request('POST',valid()))).status,503);
  process.env.RESEND_API_KEY='test-mail'; providerError=true; assert.equal((await POST(request('POST',valid()))).status,502);
});
