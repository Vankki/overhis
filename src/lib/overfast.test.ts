import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPlayerSnapshot,
  fetchPlayerStatsSummary,
  fetchPlayerSummary,
  OverfastError,
} from "./overfast";

const summary = {
  username: "TeKrop",
  avatar: "https://example.com/avatar.png",
  title: "Data Broker",
  endorsement: { level: 2 },
  competitive: {
    pc: {
      season: 22,
      tank: null,
      damage: null,
      support: {
        division: "silver",
        tier: 4,
      },
      open: null,
    },
    console: null,
  },
  last_updated_at: 1777998881,
};

const stats = {
  general: {
    games_played: 19,
    games_won: 6,
    games_lost: 13,
    time_played: 12164,
    winrate: 31.58,
    kda: 1.71,
    total: {
      eliminations: 185,
      assists: 54,
      deaths: 140,
      damage: 87194,
      healing: 176745,
    },
    average: {
      eliminations: 9.13,
      assists: 2.66,
      deaths: 6.91,
      damage: 4300.92,
      healing: 8718.1,
    },
  },
  roles: {},
  heroes: {
    ana: {
      games_played: 8,
      games_won: 3,
      games_lost: 5,
      time_played: 5363,
      winrate: 37.5,
      kda: 2.38,
      average: {
        eliminations: 8.5,
        deaths: 5.82,
        damage: 3721.16,
        healing: 10065.08,
      },
    },
    baptiste: {
      games_played: 10,
      games_won: 2,
      games_lost: 8,
      time_played: 6056,
      winrate: 20,
      kda: 1.25,
      average: {
        eliminations: 8.72,
        deaths: 7.43,
        damage: 4289.86,
        healing: 8389.5,
      },
    },
  },
};

describe("buildPlayerSnapshot", () => {
  it("maps OverFast summary and stats into a compact snapshot", () => {
    const snapshot = buildPlayerSnapshot({
      playerId: "TeKrop-2217",
      battleTag: "TeKrop#2217",
      platform: "pc",
      gameMode: "competitive",
      summary,
      stats,
    });

    expect(snapshot.player.name).toBe("TeKrop");
    expect(snapshot.player.ranks).toEqual([
      { role: "support", division: "silver", tier: 4 },
    ]);
    expect(snapshot.general.winrate).toBe(31.58);
    expect(snapshot.topHeroes.map((hero) => hero.hero)).toEqual([
      "baptiste",
      "ana",
    ]);
  });

  it("keeps missing ranks and heroes safe", () => {
    const snapshot = buildPlayerSnapshot({
      playerId: "NoRank-1234",
      battleTag: "NoRank#1234",
      platform: "pc",
      gameMode: "competitive",
      summary: { ...summary, competitive: null },
      stats: { ...stats, heroes: null },
    });

    expect(snapshot.player.ranks).toEqual([]);
    expect(snapshot.topHeroes).toEqual([]);
  });

  it("omits null role entries and maps valid role stats", () => {
    const snapshot = buildPlayerSnapshot({
      playerId: "RoleCheck-1234",
      battleTag: "RoleCheck#1234",
      platform: "pc",
      gameMode: "competitive",
      summary,
      stats: {
        ...stats,
        roles: {
          tank: null,
          support: stats.general,
        },
      },
    });

    expect(snapshot.roles).not.toHaveProperty("tank");
    expect(snapshot.roles.support.winrate).toBe(31.58);
    expect(snapshot.roles.support.totalHealing).toBe(176745);
  });

  it("ignores null heroes and keeps the top five by play time", () => {
    const snapshot = buildPlayerSnapshot({
      playerId: "HeroCheck-1234",
      battleTag: "HeroCheck#1234",
      platform: "pc",
      gameMode: "competitive",
      summary,
      stats: {
        ...stats,
        heroes: {
          zero: { time_played: 0 },
          broken: null,
          one: { time_played: 100, average: {} },
          two: { time_played: 200, average: {} },
          three: { time_played: 300, average: {} },
          four: { time_played: 400, average: {} },
          five: { time_played: 500, average: {} },
          six: { time_played: 600, average: {} },
        },
      },
    });

    expect(snapshot.topHeroes.map((hero) => hero.hero)).toEqual([
      "six",
      "five",
      "four",
      "three",
      "two",
    ]);
  });

  it("returns null for malformed timestamps", () => {
    const snapshot = buildPlayerSnapshot({
      playerId: "TimeCheck-1234",
      battleTag: "TimeCheck#1234",
      platform: "pc",
      gameMode: "competitive",
      summary: { ...summary, last_updated_at: Number.MAX_SAFE_INTEGER },
      stats,
    });

    expect(snapshot.player.lastUpdatedAt).toBeNull();
  });
});

describe("OverfastError", () => {
  it("stores an api code with the message", () => {
    const error = new OverfastError("PLAYER_NOT_FOUND", "没有找到这个玩家");
    expect(error.code).toBe("PLAYER_NOT_FOUND");
    expect(error.message).toBe("没有找到这个玩家");
  });

  it("stores optional status and cause context", () => {
    const cause = new Error("network down");
    const error = new OverfastError("OVERFAST_UNAVAILABLE", "不可用", {
      status: 503,
      cause,
    });

    expect(error.status).toBe(503);
    expect(error.cause).toBe(cause);
  });
});

describe("OverFast fetchers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("encodes the player id path for summary requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await fetchPlayerSummary("Te Krop#2217");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://overfast-api.tekrop.fr/players/Te%20Krop%232217/summary",
    );
  });

  it("includes game mode and platform query params for stats requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await fetchPlayerStatsSummary("TeKrop-2217", "competitive", "pc");

    const [url] = fetchMock.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.pathname).toBe("/players/TeKrop-2217/stats/summary");
    expect(parsed.searchParams.get("gamemode")).toBe("competitive");
    expect(parsed.searchParams.get("platform")).toBe("pc");
  });

  it("maps 404 responses to a player not found error with status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 404 }),
    );

    await expect(fetchPlayerSummary("Missing-1234")).rejects.toMatchObject({
      code: "PLAYER_NOT_FOUND",
      status: 404,
    });
  });

  it("maps 503 responses to an unavailable error with status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 503 }),
    );

    await expect(fetchPlayerSummary("TeKrop-2217")).rejects.toMatchObject({
      code: "OVERFAST_UNAVAILABLE",
      status: 503,
    });
  });
});
