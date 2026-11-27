import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollDice, LIMITS } from '../src/dice.js';
import worker from '../src/worker.js';

test('기본 굴리기와 보정치', () => {
  const r = rollDice('2d6+3', () => 0.5); // 각 주사위 4
  assert.equal(r.ok, true);
  assert.match(r.content, /\[4 \+ 4\] \+3/);
  assert.match(r.content, /\*\*11\*\*/);
});

test('곱셈 표기와 음수 보정', () => {
  const r = rollDice('1d4*3-2', () => 0);
  assert.match(r.content, /\[1 \+ 1 \+ 1\] -2/);
  assert.match(r.content, /\*\*1\*\*/);
});

test('잘못된 입력과 한도', () => {
  assert.equal(rollDice('abc').ok, false);
  assert.equal(rollDice('0d6').ok, false);
  assert.equal(rollDice(`${LIMITS.maxDice + 1}d6`).ok, false);
  assert.equal(rollDice('1d100000').ok, false);
});

// 실제 Ed25519 키로 디스코드 요청을 흉내 내서 워커를 검증
async function makeSigner() {
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const pubHex = Buffer.from(raw).toString('hex');
  const sign = async (body, ts) =>
    Buffer.from(
      await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, new TextEncoder().encode(ts + body)),
    ).toString('hex');
  return { pubHex, sign };
}

async function call(env, body, sig, ts) {
  const req = new Request('https://example.com/', {
    method: 'POST',
    body,
    headers: { 'x-signature-ed25519': sig, 'x-signature-timestamp': ts },
  });
  return worker.fetch(req, env);
}

test('서명 검증 + PING/명령어 처리', async () => {
  const { pubHex, sign } = await makeSigner();
  const env = { DISCORD_PUBLIC_KEY: pubHex };
  const ts = String(Math.floor(Date.now() / 1000));

  const ping = JSON.stringify({ type: 1 });
  let res = await call(env, ping, await sign(ping, ts), ts);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { type: 1 });

  // 서명이 틀리면 401
  res = await call(env, ping, '00'.repeat(64), ts);
  assert.equal(res.status, 401);

  const cmd = JSON.stringify({ type: 2, data: { name: 'roll', options: [{ name: 'dice', value: '1d20' }] } });
  res = await call(env, cmd, await sign(cmd, ts), ts);
  const out = await res.json();
  assert.equal(out.type, 4);
  assert.match(out.data.content, /🎲 1d20/);

  const bad = JSON.stringify({ type: 2, data: { name: 'roll', options: [{ name: 'dice', value: '??' }] } });
  res = await call(env, bad, await sign(bad, ts), ts);
  assert.equal((await res.json()).data.flags, 64);
});
