import fs from 'node:fs/promises';
import ts from 'typescript';
export const compile = async path => ts.transpileModule(await fs.readFile(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
export const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const catalogUrl = moduleUrl(await compile('../lib/ksic-data.ts'));
const industryUrl = moduleUrl((await compile('../lib/ksic.ts')).replace('"./ksic-data"', JSON.stringify(catalogUrl)));
export const validationUrl = moduleUrl((await compile('../lib/incorporation.ts')).replace('"./ksic"', JSON.stringify(industryUrl)));
export const contactUrl = moduleUrl(await compile('../lib/contact.ts'));
export const state = { bot: false, fail: false, calls: [], accepted: new Map(), checks: [] };
globalThis.__formSecurityTest = state;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (url !== 'https://api.resend.com/emails') throw new Error('Unexpected outbound request in test');
  const body = JSON.parse(options.body), key = options.headers['Idempotency-Key'];
  state.calls.push({ body, key });
  if (state.fail) return Response.json({ error: 'mock_failure' }, { status: 500 });
  if (!state.accepted.has(key)) state.accepted.set(key, body);
  return Response.json({ id: 'mock-delivery-id' });
};
const securitySource = (await compile('../lib/form-security.ts'))
  .replace('import { checkBotId } from "botid/server";', `const checkBotId = async options => { globalThis.__formSecurityTest.checks.push(options); if(options.advancedOptions.checkLevel !== 'basic') throw Error('Expected free basic mode'); return {isBot:globalThis.__formSecurityTest.bot}; };`)
  .replace('import { ipAddress } from "@vercel/functions";', `const ipAddress = request => request.headers.get('x-forwarded-for');`);
export const securityUrl = moduleUrl(securitySource);
export async function loadRoute(path) {
  return import(moduleUrl((await compile(path))
    .replace('"../../../lib/form-security"', JSON.stringify(securityUrl))
    .replace('"../../../lib/incorporation"', JSON.stringify(validationUrl))
    .replace('"../../../lib/contact"', JSON.stringify(contactUrl))));
}
let ip = 1;
export function request(body, { path = 'incorporation', type = 'application/json', origin = 'https://sooplaw.com', identity, raw = false } = {}) {
  if (!raw && body && typeof body === 'object' && !Array.isArray(body)) body = { requestId: crypto.randomUUID(), website: '', ...body };
  return new Request(`https://sooplaw.com/api/${path}`, { method: 'POST', headers: { 'Content-Type': type, origin, 'x-forwarded-for': identity || `192.0.2.${ip++}` }, body: raw ? body : JSON.stringify(body) });
}
export const originalKey = process.env.RESEND_API_KEY;
process.env.RESEND_API_KEY = 'test-only-never-real';
export function cleanup() { globalThis.fetch = realFetch; if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey; delete globalThis.__formSecurityTest; }
