import type {
  ApiErrorCode,
  GameMode,
  HeroSnapshot,
  PlayerRank,
  PlayerSnapshot,
} from "./types";

export const DEFAULT_OVERSTATS_TIMEOUT_MS = 20_000;
export const DEFAULT_MATCH_LIMIT = 20;

type JsonRecord = Record<string, unknown>;

interface OverstatsFetchOptions {
  baseUrl?: string;
  timeoutMs?: number;
  limit?: number;
}

interface BuildOverstatsPlayerSnapshotInput {
  battleTag: string;
  gameMode: GameMode;
  profile: unknown;
  matchList: unknown;
}

interface MatchAggregate {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalEliminations: number;
  totalAssists: number;
  totalDeaths: number;
  totalDamage: number;
  totalHealing: number;
}

type GeneralSnapshot = PlayerSnapshot["general"];

export class OverstatsError extends Error {
  code: ApiErrorCode;
  status?: number;
  cause?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "OverstatsError";
    this.code = code;
    this.status = options.status;
    this.cause = options.cause;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getConfiguredBaseUrl(baseUrl?: string): string {
  const configured = (baseUrl ?? process.env.OVERSTATS_BASE_URL ?? "").trim();

  if (!configured) {
    throw new OverstatsError(
      "OVERSTATS_UNAVAILABLE",
      "缺少 OVERSTATS_BASE_URL，无法查询国服数据。",
    );
  }

  return configured.replace(/\/+$/u, "");
}

function mapOverstatsError(
  payload: unknown,
  status?: number,
  cause?: unknown,
): OverstatsError {
  const record = asRecord(payload);
  const error = asStringOrNull(record.error);

  if (status === 404 || error === "bnet_not_found") {
    return new OverstatsError("PLAYER_NOT_FOUND", "没有找到这个国服玩家", {
      status,
      cause,
    });
  }

  if (error === "missing_target") {
    return new OverstatsError(
      "INVALID_BATTLETAG",
      "国服 BattleTag 格式不对，请输入玩家昵称和数字编号。",
      { status, cause },
    );
  }

  return new OverstatsError(
    "OVERSTATS_UNAVAILABLE",
    "国服数据服务暂时不可用，请稍后再试",
    { status, cause },
  );
}

async function postOverstatsJson(
  endpoint: string,
  body: JsonRecord,
  options: OverstatsFetchOptions = {},
): Promise<unknown> {
  const baseUrl = getConfiguredBaseUrl(options.baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_OVERSTATS_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new OverstatsError(
        "OVERSTATS_UNAVAILABLE",
        "国服数据服务返回了无法解析的数据，请稍后再试",
        { status: response.status, cause: error },
      );
    }

    if (!response.ok || asRecord(payload).ok === false) {
      throw mapOverstatsError(payload, response.status);
    }

    return payload;
  } catch (error) {
    if (error instanceof OverstatsError) {
      throw error;
    }

    throw new OverstatsError(
      "OVERSTATS_UNAVAILABLE",
      "国服数据服务暂时不可用，请稍后再试",
      { cause: error },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchOverstatsProfile(
  battleTag: string,
  options?: OverstatsFetchOptions,
): Promise<unknown> {
  return postOverstatsJson(
    "/api/v2/dashen-profile",
    {
      bnet_id: battleTag,
      include_previous_season: true,
      stream: false,
    },
    options,
  );
}

export async function fetchOverstatsMatchList(
  battleTag: string,
  options: OverstatsFetchOptions = {},
): Promise<unknown> {
  return postOverstatsJson(
    "/api/v2/dashen-match",
    {
      bnet_id: battleTag,
      include_fight: true,
      include_previous_season: true,
      limit: options.limit ?? DEFAULT_MATCH_LIMIT,
      render: false,
      stream: false,
    },
    options,
  );
}

function getProfileData(profile: unknown): JsonRecord {
  return asRecord(asRecord(asRecord(profile).profile_card).data);
}

function getModePayload(profile: unknown, gameMode: GameMode): JsonRecord {
  const key = gameMode === "competitive" ? "sport" : "leisure";
  return asRecord(asRecord(profile)[key]);
}

function getModeData(profile: unknown, gameMode: GameMode): JsonRecord {
  return asRecord(getModePayload(profile, gameMode).data);
}

function getMatches(matchList: unknown): JsonRecord[] {
  return asArray(asRecord(matchList).matches).filter(isRecord);
}

function getRole(roleType: unknown): PlayerRank["role"] | null {
  const normalized = String(roleType ?? "").trim().toLowerCase();

  if (normalized === "healer" || normalized === "support") {
    return "support";
  }

  if (normalized === "damage" || normalized === "dps") {
    return "damage";
  }

  if (normalized === "tank") {
    return "tank";
  }

  if (normalized === "open") {
    return "open";
  }

  return null;
}

function extractRanks(profile: unknown): PlayerRank[] {
  const sportData = getModeData(profile, "competitive");

  return asArray(sportData.guideCountData)
    .filter(isRecord)
    .flatMap((entry) => {
      const role = getRole(entry.roleType);
      const rankInfo = asRecord(entry.lastRankInfo);
      const division = asStringOrNull(rankInfo.rank_name);
      const tier = asNumber(rankInfo.rank_sub_tier);

      return role !== null && division !== null && tier > 0
        ? [{ role, division, tier }]
        : [];
    });
}

function aggregateMatches(matches: JsonRecord[]): MatchAggregate {
  const aggregate: MatchAggregate = {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalEliminations: 0,
    totalAssists: 0,
    totalDeaths: 0,
    totalDamage: 0,
    totalHealing: 0,
  };

  for (const match of matches) {
    aggregate.gamesPlayed += 1;

    if (asNumber(match.matchRet) === 1) {
      aggregate.gamesWon += 1;
    } else {
      aggregate.gamesLost += 1;
    }

    aggregate.totalEliminations += asNumber(match.kill);
    aggregate.totalAssists += asNumber(match.assist);
    aggregate.totalDeaths += asNumber(match.death);
    aggregate.totalDamage += asNumber(match.heroDamage);
    aggregate.totalHealing += asNumber(match.cure);
  }

  return aggregate;
}

function getGuidesGeneral(
  modeData: JsonRecord,
): Pick<GeneralSnapshot, "gamesPlayed" | "gamesWon" | "gamesLost" | "winrate"> {
  const guideEntries = asArray(modeData.guideCountData).filter(isRecord);
  const gamesPlayed = guideEntries.reduce(
    (total, entry) => total + asNumber(entry.matchSum),
    0,
  );

  if (gamesPlayed <= 0) {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      winrate: 0,
    };
  }

  const gamesWon = guideEntries.reduce((total, entry) => {
    const matchSum = asNumber(entry.matchSum);
    const winRate = asNumber(entry.winRate);
    return total + Math.round((matchSum * winRate) / 100);
  }, 0);

  return {
    gamesPlayed,
    gamesWon,
    gamesLost: Math.max(gamesPlayed - gamesWon, 0),
    winrate: (gamesWon / gamesPlayed) * 100,
  };
}

function buildGeneral(
  profile: unknown,
  gameMode: GameMode,
  matches: JsonRecord[],
): GeneralSnapshot {
  const modeData = getModeData(profile, gameMode);
  const summary = asRecord(modeData.presetsSummaryData);
  const serverMap = asRecord(summary.serverMapCountData);
  const matchAggregate = aggregateMatches(matches);
  const guideGeneral = getGuidesGeneral(modeData);
  const gamesPlayed =
    guideGeneral.gamesPlayed > 0
      ? guideGeneral.gamesPlayed
      : matchAggregate.gamesPlayed;
  const gamesWon =
    guideGeneral.gamesPlayed > 0 ? guideGeneral.gamesWon : matchAggregate.gamesWon;
  const gamesLost =
    guideGeneral.gamesPlayed > 0 ? guideGeneral.gamesLost : matchAggregate.gamesLost;
  const totalEliminations =
    asNumber(serverMap.kill) || matchAggregate.totalEliminations;
  const totalAssists = matchAggregate.totalAssists;
  const totalDeaths = asNumber(serverMap.death) || matchAggregate.totalDeaths;
  const totalDamage = asNumber(serverMap.damage) || matchAggregate.totalDamage;
  const totalHealing = asNumber(serverMap.cure) || matchAggregate.totalHealing;
  const winrate =
    guideGeneral.winrate ||
    (gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0);
  const averageEliminations =
    asNumber(summary.aveKill) ||
    (gamesPlayed > 0 ? totalEliminations / gamesPlayed : 0);
  const averageDeaths =
    asNumber(summary.aveDeath) ||
    (gamesPlayed > 0 ? totalDeaths / gamesPlayed : 0);
  const averageDamage =
    asNumber(summary.aveHeroDamage) ||
    (gamesPlayed > 0 ? totalDamage / gamesPlayed : 0);
  const averageHealing =
    asNumber(summary.aveCure) ||
    (gamesPlayed > 0 ? totalHealing / gamesPlayed : 0);
  const deathsForKda = totalDeaths > 0 ? totalDeaths : 1;

  return {
    gamesPlayed,
    gamesWon,
    gamesLost,
    timePlayedSeconds:
      asNumber(getProfileData(profile).gameTime) > 0
        ? asNumber(getProfileData(profile).gameTime) * 3600
        : 0,
    winrate,
    kda: (totalEliminations + totalAssists) / deathsForKda,
    totalEliminations,
    totalAssists,
    totalDeaths,
    totalDamage,
    totalHealing,
    averageEliminations,
    averageAssists: gamesPlayed > 0 ? totalAssists / gamesPlayed : 0,
    averageDeaths,
    averageDamage,
    averageHealing,
  };
}

function getHeroName(match: JsonRecord): string {
  return (
    asStringOrNull(match.heroName) ??
    asStringOrNull(match.hero_name) ??
    asStringOrNull(match.heroGuid) ??
    "unknown"
  );
}

function extractTopHeroes(matches: JsonRecord[]): HeroSnapshot[] {
  const heroMap = new Map<string, MatchAggregate>();

  for (const match of matches) {
    const hero = getHeroName(match);
    const existing =
      heroMap.get(hero) ??
      ({
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalEliminations: 0,
        totalAssists: 0,
        totalDeaths: 0,
        totalDamage: 0,
        totalHealing: 0,
      } satisfies MatchAggregate);

    const won = asNumber(match.matchRet) === 1;

    existing.gamesPlayed += 1;
    existing.gamesWon += won ? 1 : 0;
    existing.gamesLost += won ? 0 : 1;
    existing.totalEliminations += asNumber(match.kill);
    existing.totalAssists += asNumber(match.assist);
    existing.totalDeaths += asNumber(match.death);
    existing.totalDamage += asNumber(match.heroDamage);
    existing.totalHealing += asNumber(match.cure);
    heroMap.set(hero, existing);
  }

  return Array.from(heroMap.entries())
    .map(([hero, aggregate]) => {
      const gamesPlayed = aggregate.gamesPlayed;
      const deathsForKda = aggregate.totalDeaths > 0 ? aggregate.totalDeaths : 1;

      return {
        hero,
        gamesPlayed,
        gamesWon: aggregate.gamesWon,
        gamesLost: aggregate.gamesLost,
        timePlayedSeconds: 0,
        winrate: gamesPlayed > 0 ? (aggregate.gamesWon / gamesPlayed) * 100 : 0,
        kda:
          (aggregate.totalEliminations + aggregate.totalAssists) / deathsForKda,
        averageEliminations:
          gamesPlayed > 0 ? aggregate.totalEliminations / gamesPlayed : 0,
        averageDeaths: gamesPlayed > 0 ? aggregate.totalDeaths / gamesPlayed : 0,
        averageDamage: gamesPlayed > 0 ? aggregate.totalDamage / gamesPlayed : 0,
        averageHealing: gamesPlayed > 0 ? aggregate.totalHealing / gamesPlayed : 0,
      };
    })
    .sort((left, right) => right.gamesPlayed - left.gamesPlayed)
    .slice(0, 5);
}

export function buildOverstatsPlayerSnapshot({
  battleTag,
  gameMode,
  profile,
  matchList,
}: BuildOverstatsPlayerSnapshotInput): PlayerSnapshot {
  const profileRecord = asRecord(profile);
  const resolved = asRecord(profileRecord.resolved);
  const profileData = getProfileData(profile);
  const matches = getMatches(matchList);
  const playerId =
    asStringOrNull(resolved.bnet_id) ??
    String(asNumber(profileData.bnetId) || "").trim() ??
    battleTag;
  const playerName =
    asStringOrNull(resolved.full_id) ??
    asStringOrNull(profileData.name) ??
    battleTag;

  return {
    player: {
      id: playerId || battleTag,
      name: playerName,
      avatar: asStringOrNull(profileData.icon),
      title: asStringOrNull(profileData.title),
      endorsementLevel:
        asNumber(profileData.level) > 0 ? asNumber(profileData.level) : null,
      ranks: extractRanks(profile),
      lastUpdatedAt: null,
    },
    query: {
      battleTag,
      platform: "pc",
      gameMode,
    },
    general: buildGeneral(profile, gameMode, matches),
    roles: {},
    topHeroes: extractTopHeroes(matches),
  };
}
