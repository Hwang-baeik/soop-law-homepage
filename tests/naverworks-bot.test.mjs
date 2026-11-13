import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, generateKeyPairSync, verify } from 'node:crypto';
import fs from 'node:fs/promises';
import ts from 'typescript';

const compile = async path => ts.transpileModule(await fs.readFile(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const botUrl = moduleUrl(await compile('../lib/naverworks-bot.ts'));
const { createBot, RULES, WELCOME, validSignature } = await import(botUrl);
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const instant = Date.parse('2026-11-05T02:00:00Z');
const env = {
  NAVERWORKS_BOT_ID: '123', NAVERWORKS_BOT_SECRET: 'test-bot-secret',
  NAVERWORKS_CLIENT_ID: 'test-client', NAVERWORKS_CLIENT_SECRET: 'test-client-secret',
  NAVERWORKS_SERVICE_ACCOUNT: 'test@serviceaccount',
  NAVERWORKS_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).replaceAll('\n', '\\n'),
  UPSTASH_REDIS_REST_URL: 'https://redis.test', UPSTASH_REDIS_REST_TOKEN: 'test-redis-secret',
  NAVERWORKS_RETRY_SECRET: 'test-retry-secret',
  NAVERWORKS_CHANNEL_SYNC_SECRET: 'test-channel-sync-secret',
};
function fixture(overrides = {}) {
  const records = new Map(), pending = new Map(), delivered = [], tokens = [], expirations = new Map();
  const channels = new Set();
  const state = { mode: 'ok', tokenFails: false, storageFails: false };
  const http = async (url, options) => {
    assert.equal(options.cache, 'no-store');
    if (url === env.UPSTASH_REDIS_REST_URL) {
      if (state.storageFails) return new Response(null, { status: 503 });
      const [command, ...args] = JSON.parse(options.body);
      let result;
      if (command === 'SADD') {
        assert.equal(args[0], 'naverworks:123:channels');
        for (const channel of args.slice(1)) channels.add(channel);
      } else if (command === 'SMEMBERS') result = [...channels];
      else if (command === 'GET') result = records.get(args[0]) ?? null;
      else if (command === 'SET') records.set(args[0], args[1]);
      else if (command === 'SCAN') result = ['0', [...records.keys()].filter(key => key.startsWith(args[2].slice(0, -1)))];
      else if (command === 'MGET') result = args.map(key => records.get(key) ?? null);
      else if (command === 'ZRANGE') result = [...pending].sort((a,b) => a[1]-b[1]).slice(args[1], args[2]+1).map(([key])=>key);
      else if (command === 'EVAL') {
        const [script, count, key, queue, ...values] = args;
        assert.equal(count, 2); assert.equal(queue, 'naverworks:123:pending');
        if (script.startsWith("if not redis.call('GET'")) {
          result = records.has(key) ? 0 : 1;
          if (result) { records.set(key, values[0]); expirations.set(key, values[1]); pending.set(key, values[2]); }
        } else if (script.startsWith('local raw=')) {
          const raw = records.get(key), job = raw && JSON.parse(raw);
          result = job?.status === 'pending' ? raw : null;
          if (result) records.set(key, JSON.stringify({ ...job, status: 'sending' }));
          pending.delete(key);
        } else {
          assert.ok(script.startsWith("redis.call('SET'"));
          records.set(key, values[0]); expirations.set(key, values[1]);
          if (values[2] === 'pending') pending.set(key, values[3]);
          result = 1;
        }
      } else throw Error('Unexpected Redis command');
      return Response.json({ result });
    }
    if (url === 'https://auth.worksmobile.com/oauth2/v2.0/token') {
      tokens.push(options.body);
      const [header, payload, signature] = options.body.get('assertion').split('.');
      assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'RS256');
      const claims = JSON.parse(Buffer.from(payload, 'base64url'));
      assert.equal(claims.iss, env.NAVERWORKS_CLIENT_ID);
      assert.equal(claims.sub, env.NAVERWORKS_SERVICE_ACCOUNT);
      assert.equal(claims.iat, instant / 1000); assert.equal(claims.exp, instant / 1000 + 300);
      assert.ok(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, 'base64url')));
      assert.equal(options.body.get('scope'), 'bot.message');
      assert.equal(options.body.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
      return state.tokenFails ? new Response(null, { status: 403 }) : Response.json({ access_token: 'mock-access', expires_in: '3600' });
    }
    assert.equal(url, 'https://www.worksapis.com/v1.0/bots/123/channels/room-a/messages');
    assert.equal(options.headers.Authorization, 'Bearer mock-access');
    delivered.push(JSON.parse(options.body).content.text);
    if (state.mode === 'timeout') throw Error('Simulated ambiguous timeout');
    return new Response(null, { status: state.mode === 'reject' ? 429 : state.mode === 'server-error' ? 500 : 201 });
  };
  const bot = createBot({ ...env, ...overrides }, http, () => instant);
  return { bot, http, state, records, pending, delivered, tokens, expirations };
}
function event(text, extra = {}) {
  return { type: 'message', issuedTime: new Date(instant).toISOString(), source: { channelId: 'room-a', userId: 'employee' }, content: { type: 'text', text }, ...extra };
}
function request(value, extraHeaders = {}) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return new Request('https://sooplaw.com/api/naverworks/callback', { method: 'POST', headers: {
    'Content-Type': 'application/json', 'X-WORKS-BotId': '123',
    'X-WORKS-Signature': createHmac('sha256', env.NAVERWORKS_BOT_SECRET).update(body).digest('base64'), ...extraHeaders,
  }, body });
}
test('callback signature checks exact UTF-8 bytes', () => {
  const raw = Buffer.from('#접수완료');
  const signature = createHmac('sha256', env.NAVERWORKS_BOT_SECRET).update(raw).digest('base64');
  assert.equal(validSignature(raw, signature, env.NAVERWORKS_BOT_SECRET), true);
  assert.equal(validSignature(Buffer.from('#등기완료'), signature, env.NAVERWORKS_BOT_SECRET), false);
});
for (const [keyword, reply] of RULES) test(`responds to ${keyword} inside a sentence`, async () => {
  const f = fixture(); await f.bot.accept(request(event(`홍길동 건 ${keyword} 확인 부탁드립니다.`))); await f.bot.drain();
  assert.deepEqual(f.delivered, [reply]);
  assert.ok([...f.expirations.values()].every(ttl => ttl === 86400));
});
test('each keyword appears only once in a reply batch; all distinct keywords are handled', async () => {
  const f = fixture(); await f.bot.accept(request(event('#접수완료 #접수완료 #등기완료 (#완료서류발송) #비용확인 #안내완료 #서류작성완료 #채널ID #채널id'))); await f.bot.drain();
  assert.deepEqual(f.delivered, [
    '정보 취합 후 서류작성 해야합니다.',
    '날인 및 접수준비를 해야합니다.',
    '비용이 확인되었습니다.',
    '완료, 보정 등 대기 중입니다.',
    '등기완료서류 준비를 해야합니다.',
    '업무 정리를 해야합니다.',
    '채널 ID\nroom-a',
  ]);
});
test('returns the signed event channel once to that same room', async () => {
  const f = fixture();
  const command = event('이 방의 #채널ID 확인 부탁합니다.');
  await f.bot.accept(request(command));
  await f.bot.accept(request(command));
  await f.bot.drain();
  assert.deepEqual(f.delivered, ['채널 ID\nroom-a']);
  assert.equal(await f.bot.accept(request(event('#채널ID', { source: { userId: 'employee' } }))), false);
  assert.equal(await f.bot.accept(request(event('#채널ID설정'))), false);
});
test('each reply starts with the date immediately before its hashtag, when present', async () => {
  const f = fixture();
  await f.bot.accept(request(event('2026-11-04 #접수완료\n2026-11-06 #등기완료 #등기완료\n2026-11-07 확인 후 #완료서류발송')));
  await f.bot.drain();
  assert.deepEqual(f.delivered, [
    '2026-11-04 #접수완료 · 완료, 보정 등 대기 중입니다.',
    '2026-11-06 #등기완료 · 등기완료서류 준비를 해야합니다.',
    '업무 정리를 해야합니다.',
  ]);
});
test('the previous shipping hashtag does not trigger the renamed hashtag', async () => {
  const f = fixture();
  assert.equal(await f.bot.accept(request(event('#완료서류발송완료'))), false);
  assert.equal(f.records.size, 0);
});
test('duplicate callback cannot send twice, even through a fresh instance', async () => {
  const f = fixture(), data = event('#등기완료');
  await f.bot.accept(request(data)); await f.bot.drain();
  const restarted = createBot(env, f.http, () => instant);
  await restarted.accept(request(data)); await restarted.drain();
  assert.equal(f.delivered.length, 1);
});
test('new messages with the same keyword each receive a response', async () => {
  const f = fixture();
  await f.bot.accept(request(event('#접수완료'))); await f.bot.drain();
  await f.bot.accept(request(event('#접수완료', { issuedTime: new Date(instant+1000).toISOString() }))); await f.bot.drain();
  assert.equal(f.delivered.length, 2); assert.equal(f.tokens.length, 1);
});
test('welcome persists through restart and re-invitation, without task registration promises', async () => {
  const f = fixture();
  await f.bot.accept(request(event(undefined, { type: 'join', content: undefined }))); await f.bot.drain();
  const restarted = createBot(env, f.http, () => instant);
  await restarted.accept(request(event(undefined, { type: 'join', content: undefined, issuedTime: new Date(instant+1000).toISOString() }))); await restarted.drain();
  assert.deepEqual(f.delivered, [`${WELCOME}\n\n채널 ID\nroom-a`]); assert.ok([...f.expirations.values()].every(ttl=>ttl===0));
  assert.ok(RULES.every(([keyword, reply]) => WELCOME.includes(keyword) && WELCOME.includes(reply)));
  assert.deepEqual(WELCOME.match(/^#.+$/gm), [
    '#안내완료', '#서류작성완료', '#비용확인', '#접수완료', '#등기완료', '#완료서류발송', '#채널ID',
  ]);
  assert.ok(!WELCOME.includes('자동 등록'));
});
test('channel registry preserves prior replies and records new invitations', async () => {
  const f = fixture();
  f.records.set('naverworks:123:event:old', JSON.stringify({ channelId: 'old-room' }));
  assert.deepEqual(await f.bot.channelIds(), ['old-room']);
  f.records.delete('naverworks:123:event:old');
  await f.bot.accept(request(event(undefined, { type: 'join', content: undefined })));
  assert.deepEqual(await f.bot.channelIds(), ['old-room', 'room-a']);
  const req = new Request('https://sooplaw.com/api/naverworks/channels', {
    headers: { Authorization: 'Bearer test-channel-sync-secret' },
  });
  assert.equal(f.bot.authorizedChannelSync(req), true);
  assert.equal(f.bot.authorizedRetry(req), false);
});
for (const [name, data] of [
  ['ordinary text', event('안녕하세요')], ['image', event('#접수완료', { content: { type: 'image' } })],
  ['1:1 conversation', event('#접수완료', { source: { userId: 'employee' } })],
  ['bot sender', event('#접수완료', { source: { channelId: 'room-a', userId: '123' } })],
  ['another member joining', event(undefined, { type: 'joined' })], ['leave', event(undefined, { type: 'leave' })],
]) test(`ignores ${name}`, async () => {
  const f = fixture(); assert.equal(await f.bot.accept(request(data)), false); assert.equal(f.records.size, 0);
});
for (const [name, data, headers, code] of [
  ['bad signature', event('#접수완료'), { 'X-WORKS-Signature': 'invalid' }, 'invalid_signature'],
  ['wrong bot', event('#접수완료'), { 'X-WORKS-BotId': '999' }, 'invalid_bot'],
  ['old event', event('#접수완료', { issuedTime: new Date(instant-601000).toISOString() }), {}, 'expired_event'],
  ['invalid date', event('#접수완료', { issuedTime: 'invalid' }), {}, 'expired_event'],
  ['malformed JSON', '{', {}, 'invalid_json'], ['null event', 'null', {}, 'invalid_event'],
  ['oversize body', 'a'.repeat(65537), {}, 'body_too_large'],
]) test(`rejects ${name} before recording or sending`, async () => {
  const f = fixture(); await assert.rejects(f.bot.accept(request(data, headers)), e=>e.code===code);
  assert.equal(f.records.size, 0); assert.equal(f.tokens.length, 0);
});
test('missing configuration and unavailable storage cannot acknowledge jobs as stored', async () => {
  const f = fixture({ NAVERWORKS_CLIENT_SECRET: undefined });
  await assert.rejects(f.bot.accept(request(event('#접수완료'))), e=>e.status===503);
  const g = fixture(); g.state.storageFails = true;
  await assert.rejects(g.bot.accept(request(event('#접수완료'))), e=>e.code==='storage_unavailable');
});
test('Vercel Marketplace KV environment names reuse the connected Redis store', async () => {
  const f = fixture({ UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined,
    KV_REST_API_URL: env.UPSTASH_REDIS_REST_URL, KV_REST_API_TOKEN: env.UPSTASH_REDIS_REST_TOKEN });
  await f.bot.accept(request(event('#등기완료'))); await f.bot.drain();
  assert.deepEqual(f.delivered, ['등기완료서류 준비를 해야합니다.']);
});
test('an authentication failure leaves durable jobs available after recovery', async () => {
  const f = fixture(); await f.bot.accept(request(event('#등기완료'))); f.state.tokenFails = true;
  await assert.rejects(f.bot.drain()); assert.equal(f.pending.size, 1);
  f.state.tokenFails = false; await f.bot.drain(); assert.equal(f.delivered.length, 1);
});
test('known API rejection is retryable but an ambiguous timeout is not blindly resent', async () => {
  const f = fixture(); await f.bot.accept(request(event('#등기완료'))); f.state.mode = 'reject'; await f.bot.drain();
  assert.equal(f.pending.size, 1); f.state.mode = 'ok'; await f.bot.drain();
  assert.equal(JSON.parse([...f.records.values()][0]).status, 'sent');
  const g = fixture(); await g.bot.accept(request(event('#등기완료'))); g.state.mode = 'timeout'; await g.bot.drain();
  g.state.mode = 'ok'; await g.bot.drain(); assert.equal(g.delivered.length, 1);
  assert.equal(JSON.parse([...g.records.values()][0]).status, 'uncertain');
});
test('concurrent handlers claim a single delivery and store no original text', async () => {
  const f = fixture(); await f.bot.accept(request(event('비공개 고객정보 #등기완료')));
  const other = createBot(env, f.http, () => instant);
  await Promise.all([f.bot.drain(), other.drain()]); assert.equal(f.delivered.length, 1);
  assert.ok(![...f.records.values()].join('').includes('비공개 고객정보'));
});
test('server-side send errors also require verification before another attempt', async () => {
  const f = fixture(); await f.bot.accept(request(event('#등기완료'))); f.state.mode = 'server-error';
  await f.bot.drain(); f.state.mode = 'ok'; await f.bot.drain();
  assert.equal(f.delivered.length, 1); assert.equal(JSON.parse([...f.records.values()][0]).status, 'uncertain');
});
test('operator recovery requires the configured secret', () => {
  const f = fixture();
  assert.equal(f.bot.authorizedRetry(new Request('https://sooplaw.com')), false);
  assert.equal(f.bot.authorizedRetry(new Request('https://sooplaw.com', { headers: { Authorization: 'Bearer test-retry-secret' } })), true);
  assert.equal(fixture({ NAVERWORKS_RETRY_SECRET: undefined }).bot.authorizedRetry(new Request('https://sooplaw.com')), false);
});
test('callback route acknowledges only after persistence, then schedules background delivery', async () => {
  const old = { ...process.env }, realFetch = globalThis.fetch, callbacks = [];
  const f = fixture(); Object.assign(process.env, env); globalThis.fetch = f.http;
  globalThis.__naverworksAfter = callback => callbacks.push(callback);
  try {
    const code = (await compile('../app/api/naverworks/callback/route.ts'))
      .replace('import { after } from "next/server";', 'const after = globalThis.__naverworksAfter;')
      .replace('"../../../../lib/naverworks-bot"', JSON.stringify(botUrl))
      // Route uses the production clock; inject our signed fixture's time for this isolated module.
      .replace('const bot = createBot();', `const bot = createBot(process.env, fetch, () => ${instant});`);
    const route = await import(moduleUrl(code));
    assert.equal((await route.POST(request(event('#접수완료')))).status, 200);
    assert.equal(f.records.size, 1); assert.equal(f.delivered.length, 0);
    assert.equal(callbacks.length, 1); await callbacks.shift()(); assert.equal(f.delivered.length, 1);
    assert.equal((await route.POST(request(event('#접수완료'), { 'X-WORKS-Signature': 'bad' }))).status, 401);
    assert.equal(callbacks.length, 0);
  } finally {
    globalThis.fetch = realFetch; delete globalThis.__naverworksAfter;
    for (const key of Object.keys(env)) { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; }
  }
});
