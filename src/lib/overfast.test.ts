import { describe, expect, it } from "vitest";
import { buildPlayerSnapshot, OverfastError } from "./overfast";

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
});

describe("OverfastError", () => {
  it("stores an api code with the message", () => {
    const error = new OverfastError("PLAYER_NOT_FOUND", "没有找到这个玩家");
    expect(error.code).toBe("PLAYER_NOT_FOUND");
    expect(error.message).toBe("没有找到这个玩家");
  });
});
