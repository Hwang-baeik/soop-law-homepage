import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRoute, validationUrl, request, state, cleanup } from './form-test-helpers.mjs';
const { initialSurvey, validateSurvey, surveyText } = await import(validationUrl);
const { POST } = await loadRoute('../app/api/incorporation/route.ts');
const sample = () => ({ ...initialSurvey(), contactName: '테스트 담당자', email: 'test@example.com', phone: '010-1234-5678', agree: true, authority: true });
test('blank establishment fields are sent as undecided, not unchosen defaults', () => {
  const s = validateSurvey(sample());
  assert.equal(s.company.announcement, '미정'); assert.equal(s.company.authorizedShares, '미정');
  assert.ok(surveyText(s).includes('상호 1순위: 미정'));
  assert.ok(surveyText(s).includes('주민등록번호 전체 및 비밀번호: 별도 확인'));
});
for (const [label, change] of [
  ['contact', { contactName: '' }], ['email', { email: 'bad' }], ['phone', { phone: 'bad' }], ['consent', { agree: false }], ['authority', { authority: false }],
  ['negative capital', { company: { ...sample().company, capital: '-1' } }],
  ['invalid birthday', { officers: [{ ...sample().officers[0], birthDate: '2025-02-30' }] }],
  ['resident number', { notes: '990101-1234567' }],
  ['too many officers', { officers: Array(11).fill(sample().officers[0]) }],
  ['incomplete shares', { shareholders: [{ ...sample().shareholders[0], share: '40' }] }],
]) test(`rejects ${label}`, async () => assert.equal((await POST(request({ survey: { ...sample(), ...change } }))).status, 400));
test('accepts undecided share alongside a known share and accepts 100 percent total', () => {
  const p = sample().shareholders[0];
  assert.equal(validateSurvey({ ...sample(), shareholders: [{ ...p, share: '40' }, { ...p, share: '미정' }] }).shareholders.length, 2);
  assert.equal(validateSurvey({ ...sample(), shareholders: [{ ...p, share: '100' }] }).shareholders[0].share, '100');
});
test('checks source, honeypot, UUID, content-type and stream limit', async () => {
  assert.equal((await POST(request({ survey: sample() }, { origin: 'https://evil.example' }))).status, 403);
  assert.equal((await POST(request({ survey: sample(), website: 'spam' }))).status, 400);
  assert.equal((await POST(request({ survey: sample(), requestId: 'bad' }))).status, 400);
  assert.equal((await POST(request('{}', { type: 'text/plain', raw: true }))).status, 415);
  assert.equal((await POST(request('x'.repeat(49153), { raw: true }))).status, 413);
});
test('rejects BotID bots before mail sending', async () => {
  state.bot = true;
  const before = state.calls.length;
  assert.equal((await POST(request({ survey: sample() }))).status, 403);
  assert.equal(state.calls.length, before); state.bot = false;
});
test('sends organized plain text to fixed office recipient; identical content deduplicates across request IDs', async () => {
  state.accepted.clear();
  const s = { ...sample(), notes: '<script>example</script>' };
  const first = await POST(request({ survey: s })); assert.equal(first.status, 200);
  const result = await first.json(); assert.match(result.receipt, /^SOOP-[A-F0-9]{12}$/);
  await Promise.all([POST(request({ survey: s })), POST(request({ survey: s }))]);
  assert.equal(state.accepted.size, 1);
  const body = [...state.accepted.values()][0]; assert.deepEqual(body.to, ['soop@sooplaw.com']); assert.equal(body.reply_to, s.email);
  assert.ok(body.text.includes(result.receipt)); assert.ok(body.text.includes('상호 1순위: 미정')); assert.ok(!Object.hasOwn(body, 'html'));
});
test('provider failure never reports success and retry retains idempotency key', async () => {
  const body = { survey: { ...sample(), notes: 'retry test' } };
  state.fail = true; assert.equal((await POST(request(body))).status, 503);
  const key = state.calls.at(-1).key; state.fail = false;
  assert.equal((await POST(request(body))).status, 200); assert.equal(state.calls.at(-1).key, key);
});
const freeSample = () => ({
  contactName: "테스트 담당자",
  email: "test@example.com",
  phone: "010-1234-5678",
  agree: true,
  freeText: "  온라인 쇼핑몰을 운영합니다.\n\n본점은 미정입니다.  ",
});

test('free submissions mail the original text and contact details without structured fields', async () => {
  const survey = freeSample();
  const response = await POST(request({ mode: "free", survey }));
  assert.equal(response.status, 200);
  const { body } = state.calls.at(-1);
  assert.deepEqual(body.to, ["soop@sooplaw.com"]);
  assert.equal(body.reply_to, survey.email);
  assert.ok(body.text.includes(`【자유 작성 내용】\n${survey.freeText}\n\n`));
  assert.ok(body.text.includes("incorporation-free-v1"));
  assert.ok(!body.text.includes("【회사 기본정보】"));

  const empty = await POST(request({ mode: "free", survey: { ...survey, freeText: "" } }));
  assert.equal(empty.status, 200);
  assert.ok(state.calls.at(-1).body.text.includes("【자유 작성 내용】\n미정"));
});

test('invalid free submissions and unsupported modes are rejected before mail delivery', async () => {
  const survey = freeSample();
  const before = state.calls.length;
  for (const override of [
    { agree: false },
    { email: "invalid" },
    { freeText: "주민등록번호 990101-1234567" },
    { freeText: "가".repeat(6001) },
  ]) {
    assert.equal((await POST(request({ mode: "free", survey: { ...survey, ...override } }))).status, 400);
  }
  assert.equal((await POST(request({ mode: "unknown", survey: sample() }))).status, 400);
  assert.equal(state.calls.length, before);
});

test('instance backstop throttles repeated accepted attempts', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await POST(request({ survey: sample() }, { identity: '198.51.100.5' }))).status, 200);
  const response = await POST(request({ survey: sample() }, { identity: '198.51.100.5' })); assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '600');
});
test('missing mail config fails closed without naming secrets', async () => {
  delete process.env.RESEND_API_KEY;
  const response = await POST(request({ survey: sample() })); assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('RESEND_API_KEY'));
  process.env.RESEND_API_KEY = 'test-only-never-real';
});
test.after(cleanup);
