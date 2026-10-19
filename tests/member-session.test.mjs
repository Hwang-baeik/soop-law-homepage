import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const load = async (path) => {
  const source = await fs.readFile(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
};
const auth = await load('../lib/supabase-browser.ts');
const { accessRedirect } = await load('../lib/auth-access.ts');
const originalFetch = globalThis.fetch;
const oldWindow = globalThis.window;
const oldStorage = globalThis.sessionStorage;
const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const values = new Map();
globalThis.window = { dispatchEvent: () => {}, location: { origin: 'https://sooplaw.com' } };
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
} });
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://integration.example.invalid';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
const session = (overrides = {}) => ({ access_token: 'old-token', refresh_token: 'refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, user: { id: 'test-user' }, ...overrides });
const refreshed = session({ access_token: 'new-token', refresh_token: 'rotated-refresh-token' });
test.afterEach(() => { values.clear(); globalThis.fetch = originalFetch; });
test.after(() => {
  if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
  if (oldStorage === undefined) delete globalThis.sessionStorage;
  else Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: oldStorage });
  if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
});

for (const [name, raw] of [['malformed JSON', '{'], ['null', 'null'], ['empty object', '{}'], ['missing user', JSON.stringify({access_token:'x',refresh_token:'y'})]]) {
  test(`rejects stored ${name}`, () => {
    values.set('soop_session', raw);
    assert.equal(auth.getSession(), null);
    assert.equal(values.has('soop_session'), false);
  });
}
for (const status of ['pending', 'suspended', 'rejected']) test(`blocks ${status} profile`, () => assert.equal(accessRedirect({role:'client',status}, false), '/login'));
test('blocks missing profile and unknown role', () => {
  assert.equal(accessRedirect(null, true), '/login');
  assert.equal(accessRedirect({role:'unknown',status:'approved'}, true), '/login');
});
test('routes clients away from internal area', () => assert.equal(accessRedirect({role:'client',status:'approved'}, true), '/mypage'));
test('permits approved clients and internal users in their areas', () => {
  assert.equal(accessRedirect({role:'client',status:'approved'}, false), null);
  assert.equal(accessRedirect({role:'staff',status:'approved'}, true), null);
  assert.equal(accessRedirect({role:'admin',status:'approved'}, true), null);
});
test('requires initial password change before internal access', () => assert.equal(accessRedirect({role:'staff',status:'approved',must_change_password:true}, true), '/change-password?required=1'));

test('deduplicates concurrent refresh and uses rotated token for both requests', async () => {
  auth.saveSession(session({expires_at:1}));
  let refreshCount=0, requestCount=0;
  globalThis.fetch = async (url, init) => {
    if (url.includes('grant_type=refresh_token')) { refreshCount++; await new Promise(resolve=>setTimeout(resolve,5)); return Response.json(refreshed); }
    requestCount++;
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer new-token');
    return Response.json([]);
  };
  const responses = await Promise.all([auth.rest('companies','old-token'),auth.rest('profiles','old-token')]);
  assert.ok(responses.every(r=>r.ok));
  assert.equal(refreshCount,1); assert.equal(requestCount,2);
  assert.equal(auth.getSession().refresh_token,'rotated-refresh-token');
});
test('refresh completing after logout cannot restore a session', async () => {
  auth.saveSession(session({expires_at:1}));
  let release, started;
  const signal = new Promise(resolve=>{started=resolve;});
  globalThis.fetch = async (url) => {
    if (url.includes('grant_type=refresh_token')) { started(); return new Promise(resolve=>{release=()=>resolve(Response.json(refreshed));}); }
    return Response.json([]);
  };
  const request = auth.rest('companies','old-token');
  await signal; auth.clearSession(); release(); await request;
  assert.equal(auth.getSession(),null);
});
test('retries a 401 once with refreshed token and preserves request preferences', async () => {
  auth.saveSession(session());
  let count=0;
  globalThis.fetch = async (url, init) => {
    if (url.includes('grant_type=refresh_token')) return Response.json(refreshed);
    count++;
    assert.equal(new Headers(init.headers).get('Prefer'),'return=minimal');
    return count===1 ? Response.json({}, {status:401}) : Response.json([]);
  };
  assert.ok((await auth.rest('companies','old-token',{headers:{Prefer:'return=minimal'}})).ok);
  assert.equal(count,2);
});
test('failed refresh clears unusable local session', async () => {
  auth.saveSession(session({expires_at:1}));
  globalThis.fetch=async (url)=>url.includes('grant_type=refresh_token') ? Response.json({},{status:400}) : Response.json({},{status:401});
  assert.equal((await auth.rest('companies','old-token')).status,401);
  assert.equal(auth.getSession(),null);
});
test('logout clears local session even when the network fails', async () => {
  auth.saveSession(session());
  globalThis.fetch=async()=>{throw new TypeError('network failure');};
  await assert.rejects(auth.signOut());
  assert.equal(auth.getSession(),null);
});
test('login returns session and translates unconfirmed email error', async () => {
  globalThis.fetch=async()=>Response.json(session());
  assert.equal((await auth.signIn('test@example.invalid','unused')).user.id,'test-user');
  globalThis.fetch=async()=>Response.json({message:'Email not confirmed'},{status:400});
  await assert.rejects(auth.signIn('test@example.invalid','unused'),/이메일 인증/);
});
test('loads MFA factors from GET user instead of unsupported GET factors', async () => {
  globalThis.fetch=async(url)=>{
    assert.equal(new URL(url).pathname,'/auth/v1/user');
    return Response.json({id:'test-user',factors:[{id:'totp-factor',status:'verified',factor_type:'totp'}]});
  };
  const factors=await auth.listMfaFactors('valid-token');
  assert.equal(factors[0].id,'totp-factor');
});
