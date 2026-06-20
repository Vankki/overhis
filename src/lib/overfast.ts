import type {
  ApiErrorCode,
  GameMode,
  HeroSnapshot,
  Platform,
  PlayerRank,
  PlayerSnapshot,
} from "./types";

export const OVERFAST_BASE_URL = "https://overfast-api.tekrop.fr";
export const DEFAULT_TIMEOUT_MS = 10_000;

type JsonRecord = Record<string, unknown>;

interface BuildPlayerSnapshotInput {
  playerId: string;
  battleTag: string;
  platform: Platform;
  gameMode: GameMode;
  summary: unknown;
  stats: unknown;
}

export class OverfastError extends Error {
  code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "OverfastError";
    this.code = code;
  }
}

async function fetchJson<TData>(
  url: string,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<TData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new OverfastError("PLAYER_NOT_FOUND", "没有找到这个玩家");
    }

    if (!response.ok) {
      throw new OverfastError(
        "OVERFAST_UNAVAILABLE",
        "OverFast 暂时不可用，请稍后再试",
      );
    }

    return (await response.json()) as TData;
  } catch (error) {
    if (error instanceof OverfastError) {
      throw error;
    }

    throw new OverfastError(
      "OVERFAST_UNAVAILABLE",
      "OverFast 暂时不可用，请稍后再试",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPlayerSummary(
  playerId: string,
  options?: { timeoutMs?: number },
): Promise<unknown> {
  return fetchJson(
    `${OVERFAST_BASE_URL}/players/${encodeURIComponent(playerId)}/summary`,
    options,
  );
}

export async function fetchPlayerStatsSummary(
  playerId: string,
  gameMode: GameMode,
  platform: Platform,
  options?: { timeoutMs?: number },
): Promise<unknown> {
  const url = new URL(
    `${OVERFAST_BASE_URL}/players/${encodeURIComponent(playerId)}/stats/summary`,
  );
  url.searchParams.set("gamemode", gameMode);
  url.searchParams.set("platform", platform);

  return fetchJson(url.toString(), options);
}

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function mapGeneral(value: unknown): PlayerSnapshot["general"] {
  const general = asRecord(value);
  const total = asRecord(general.total);
  const average = asRecord(general.average);

  return {
    gamesPlayed: asNumber(general.games_played),
    gamesWon: asNumber(general.games_won),
    gamesLost: asNumber(general.games_lost),
    timePlayedSeconds: asNumber(general.time_played),
    winrate: asNumber(general.winrate),
    kda: asNumber(general.kda),
    totalEliminations: asNumber(total.eliminations),
    totalAssists: asNumber(total.assists),
    totalDeaths: asNumber(total.deaths),
    totalDamage: asNumber(total.damage),
    totalHealing: asNumber(total.healing),
    averageEliminations: asNumber(average.eliminations),
    averageAssists: asNumber(average.assists),
    averageDeaths: asNumber(average.deaths),
    averageDamage: asNumber(average.damage),
    averageHealing: asNumber(average.healing),
  };
}

function extractRanks(summary: unknown, platform: Platform): PlayerRank[] {
  const competitive = asRecord(asRecord(summary).competitive);
  const platformRanks = asRecord(competitive[platform]);
  const roles: PlayerRank["role"][] = ["tank", "damage", "support", "open"];

  return roles.flatMap((role) => {
    const rank = asRecord(platformRanks[role]);
    const division = asStringOrNull(rank.division);
    const tier = asNumber(rank.tier);

    return division !== null && tier > 0 ? [{ role, division, tier }] : [];
  });
}

function extractRoles(stats: unknown): Record<string, PlayerSnapshot["general"]> {
  const roles = asRecord(asRecord(stats).roles);

  return Object.fromEntries(
    Object.entries(roles).map(([role, value]) => [role, mapGeneral(value)]),
  );
}

function extractTopHeroes(stats: unknown): HeroSnapshot[] {
  const heroes = asRecord(asRecord(stats).heroes);

  return Object.entries(heroes)
    .map(([hero, value]) => {
      const heroStats = asRecord(value);
      const average = asRecord(heroStats.average);

      return {
        hero,
        gamesPlayed: asNumber(heroStats.games_played),
        gamesWon: asNumber(heroStats.games_won),
        gamesLost: asNumber(heroStats.games_lost),
        timePlayedSeconds: asNumber(heroStats.time_played),
        winrate: asNumber(heroStats.winrate),
        kda: asNumber(heroStats.kda),
        averageEliminations: asNumber(average.eliminations),
        averageDeaths: asNumber(average.deaths),
        averageDamage: asNumber(average.damage),
        averageHealing: asNumber(average.healing),
      };
    })
    .filter((hero) => hero.timePlayedSeconds > 0)
    .sort((a, b) => b.timePlayedSeconds - a.timePlayedSeconds)
    .slice(0, 5);
}

export function buildPlayerSnapshot({
  playerId,
  battleTag,
  platform,
  gameMode,
  summary,
  stats,
}: BuildPlayerSnapshotInput): PlayerSnapshot {
  const summaryRecord = asRecord(summary);
  const endorsement = asRecord(summaryRecord.endorsement);
  const lastUpdatedAt = asNumber(summaryRecord.last_updated_at);

  return {
    player: {
      id: playerId,
      name: asStringOrNull(summaryRecord.username) ?? playerId,
      avatar: asStringOrNull(summaryRecord.avatar),
      title: asStringOrNull(summaryRecord.title),
      endorsementLevel:
        typeof endorsement.level === "number" && Number.isFinite(endorsement.level)
          ? endorsement.level
          : null,
      ranks: extractRanks(summary, platform),
      lastUpdatedAt:
        lastUpdatedAt > 0 ? new Date(lastUpdatedAt * 1000).toISOString() : null,
    },
    query: {
      battleTag,
      platform,
      gameMode,
    },
    general: mapGeneral(asRecord(stats).general),
    roles: extractRoles(stats),
    topHeroes: extractTopHeroes(stats),
  };
}
