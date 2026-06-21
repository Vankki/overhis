const INVALID_BATTLETAG_MESSAGE =
  "国服 BattleTag 格式不对，请输入玩家昵称和数字编号。";

export interface NormalizedBattleTag {
  display: string;
  playerId: string;
}

export function normalizeBattleTag(input: string): NormalizedBattleTag {
  const trimmed = input.trim().replace("＃", "#");
  const match = trimmed.match(/^([^\s#]+)#(\d{3,8})$/u);

  if (!match) {
    throw new Error(INVALID_BATTLETAG_MESSAGE);
  }

  const name = match[1];
  const discriminator = match[2];

  return {
    display: `${name}#${discriminator}`,
    playerId: `${name}#${discriminator}`,
  };
}

export function getInvalidBattleTagMessage(): string {
  return INVALID_BATTLETAG_MESSAGE;
}
