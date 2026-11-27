// 주사위 표기 해석 + 굴리기 (디스코드와 무관한 순수 로직)

export const LIMITS = {
  maxDice: 100, // 한 번에 굴릴 수 있는 주사위 총 개수 (N * K)
  maxSides: 1000,
  maxModifier: 100000,
};

const DICE_RE = /^(\d+)d(\d+)(?:\*(\d+))?([+-]\d+)?$/i;

/**
 * "2d6*2+3" 같은 표기를 굴리고 응답 문자열을 돌려준다.
 * @param {string} input
 * @param {() => number} random 0 이상 1 미만 난수 (테스트용 주입)
 * @returns {{ ok: boolean, content: string }}
 */
export function rollDice(input, random = Math.random) {
  const text = String(input ?? '').replace(/\s+/g, '');
  const match = text.match(DICE_RE);
  if (!match) {
    return {
      ok: false,
      content: '⚠️ 올바른 형식으로 입력해주세요! 예: `/roll 2d6+3` 또는 `/roll 1d20`',
    };
  }

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const multiplyCount = match[3] ? parseInt(match[3], 10) : 1;
  const modifier = match[4] ? parseInt(match[4], 10) : 0;

  if (count <= 0 || sides <= 0 || multiplyCount <= 0) {
    return { ok: false, content: '⚠️ 주사위 수, 면의 수, 곱셈 수는 1 이상이어야 해요!' };
  }

  const totalDiceCount = count * multiplyCount;
  if (totalDiceCount > LIMITS.maxDice) {
    return { ok: false, content: `⚠️ 주사위는 한 번에 최대 ${LIMITS.maxDice}개까지 굴릴 수 있어요!` };
  }
  if (sides > LIMITS.maxSides) {
    return { ok: false, content: `⚠️ 주사위 면은 최대 ${LIMITS.maxSides}까지 가능해요!` };
  }
  if (Math.abs(modifier) > LIMITS.maxModifier) {
    return { ok: false, content: `⚠️ 보정치는 ±${LIMITS.maxModifier} 이내로 입력해주세요!` };
  }

  const rolls = Array.from({ length: totalDiceCount }, () => Math.floor(random() * sides) + 1);
  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + modifier;

  const modifierText = modifier === 0 ? '' : modifier > 0 ? ` +${modifier}` : ` ${modifier}`;
  const content = `🎲 ${text}\n\n[${rolls.join(' + ')}]${modifierText}\n\n **${total}**`;

  return { ok: true, content };
}
