const INVALID_BATTLETAG_MESSAGE =
  "BattleTag 格式不对，请输入类似 TeKrop#2217 的格式。";

export interface NormalizedBattleTag {
  display: string;
  playerId: string;
}

export function normalizeBattleTag(input: string): NormalizedBattleTag {
  const trimmed = input.trim();
  const match = trimmed.match(/^([^\s#]+)#(\d{3,8})$/u);

  if (!match) {
    throw new Error(INVALID_BATTLETAG_MESSAGE);
  }

  const name = match[1];
  const discriminator = match[2];

  return {
    display: `${name}#${discriminator}`,
    playerId: `${name}-${discriminator}`,
  };
}

export function getInvalidBattleTagMessage(): string {
  return INVALID_BATTLETAG_MESSAGE;
}
