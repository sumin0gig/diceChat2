// Cloudflare Workers 진입점
// 디스코드가 슬래시 명령어가 쓰일 때마다 이 주소로 HTTP 요청을 보낸다.
// 상시 접속(게이트웨이)이 필요 없어서 서버를 켜둘 필요가 없다.

import { rollDice } from './dice.js';

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 };
const ResponseType = { PONG: 1, CHANNEL_MESSAGE: 4 };
const EPHEMERAL = 1 << 6; // 본인에게만 보이는 메시지

function hexToBytes(hex) {
  if (!/^[0-9a-f]*$/i.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

// 디스코드가 보낸 요청이 맞는지 Ed25519 서명으로 확인 (필수: 안 하면 디스코드가 엔드포인트 등록을 거부함)
export async function verifyDiscordRequest(body, signature, timestamp, publicKeyHex) {
  if (!signature || !timestamp || !publicKeyHex) return false;
  const sig = hexToBytes(signature);
  const pub = hexToBytes(publicKeyHex);
  if (!sig || !pub) return false;
  try {
    const key = await crypto.subtle.importKey('raw', pub, { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      sig,
      new TextEncoder().encode(timestamp + body),
    );
  } catch {
    return false;
  }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json;charset=UTF-8' },
  });

export default {
  async fetch(request, env) {
    if (request.method === 'GET') {
      return new Response('🎲 diceChat 봇이 동작 중이에요.');
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const body = await request.text();
    const valid = await verifyDiscordRequest(
      body,
      request.headers.get('x-signature-ed25519'),
      request.headers.get('x-signature-timestamp'),
      env.DISCORD_PUBLIC_KEY,
    );
    if (!valid) return new Response('Bad request signature', { status: 401 });

    const interaction = JSON.parse(body);

    if (interaction.type === InteractionType.PING) {
      return json({ type: ResponseType.PONG });
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data?.name === 'roll') {
      const input = interaction.data.options?.find((o) => o.name === 'dice')?.value;
      const { ok, content } = rollDice(input);
      return json({
        type: ResponseType.CHANNEL_MESSAGE,
        // 형식 오류는 본인에게만 보여서 채널이 지저분해지지 않게
        data: ok ? { content } : { content, flags: EPHEMERAL },
      });
    }

    return json({ error: 'Unknown interaction' }, 400);
  },
};
