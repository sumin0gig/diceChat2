// 디스코드에 등록할 슬래시 명령어 정의

export const ROLL_COMMAND = {
  name: 'roll',
  description: '주사위를 굴립니다! 예: /roll 2d6+3',
  type: 1, // CHAT_INPUT
  // 0 = 서버에 설치, 1 = 사용자 계정에 설치 (서버 관리 권한 없어도 쓸 수 있음)
  integration_types: [0, 1],
  // 0 = 서버 채널, 1 = 봇과의 DM, 2 = 그룹 DM·다른 사람과의 DM
  contexts: [0, 1, 2],
  options: [
    {
      type: 3, // STRING
      name: 'dice',
      description: '주사위 형식 (예: 1d20, 2d6+3, 2d6*2+1)',
      required: true,
    },
  ],
};

export const COMMANDS = [ROLL_COMMAND];
