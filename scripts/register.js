// 슬래시 명령어를 디스코드에 "전역"으로 등록 (명령어를 바꿨을 때만 한 번 실행)
// 사용법: node scripts/register.js
// .env 에 DISCORD_TOKEN, DISCORD_APPLICATION_ID 필요
// 테스트용으로 특정 서버에만 즉시 등록하려면 .env 에 GUILD_ID 도 넣기

import 'dotenv/config';
import { COMMANDS } from '../src/commands.js';

const { DISCORD_TOKEN, DISCORD_APPLICATION_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_APPLICATION_ID) {
  console.error('❌ .env 에 DISCORD_TOKEN 과 DISCORD_APPLICATION_ID 를 넣어주세요.');
  process.exit(1);
}

const base = `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}`;
const url = GUILD_ID ? `${base}/guilds/${GUILD_ID}/commands` : `${base}/commands`;

const res = await fetch(url, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bot ${DISCORD_TOKEN}`,
  },
  body: JSON.stringify(GUILD_ID ? COMMANDS.map(({ integration_types, contexts, ...c }) => c) : COMMANDS),
});

if (!res.ok) {
  console.error(`❌ 등록 실패 (${res.status})`, await res.text());
  process.exit(1);
}

console.log(GUILD_ID ? `✅ 서버(${GUILD_ID})에 명령어 등록 완료` : '✅ 전역 명령어 등록 완료 (모든 서버·DM에서 사용 가능)');
