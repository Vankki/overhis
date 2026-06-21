import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameMode } from "./types";
import {
  buildOverstatsPlayerSnapshot,
  fetchOverstatsMatchList,
  fetchOverstatsProfile,
  OverstatsError,
} from "./overstats";

const profile = {
  ok: true,
  customer_token: "hidden",
  resolved: {
    query: "西野七濑#51404",
    full_id: "西野七濑#51404",
    bnet_id: "517215771",
    has_customer_token: true,
  },
  profile_card: {
    data: {
      bnetId: 517215771,
      name: "西野七濑#51404",
      icon: "https://example.com/avatar.png",
      title: "纸糊的支援",
      level: 3,
      gameTime: "12.5",
    },
  },
  sport: {
    data: {
      guideCountData: [
        {
          roleType: "healer",
          lastRankInfo: {
            rank_name: "Platinum",
            rank_sub_tier: 5,
          },
          matchSum: 12,
          winRate: "50",
        },
      ],
      presetsSummaryData: {
        aveKill: 10,
        aveHeroDamage: 3200,
        aveCure: 6400,
        aveDeath: 5,
        serverMapCountData: {
          kill: 120,
          damage: 38400,
          cure: 76800,
          death: 60,
        },
      },
    },
  },
  leisure: {
    data: {
      guideCountData: [],
    },
  },
};

const matchList = {
  ok: true,
  count: 3,
  matches: [
    {
      matchId: "match-1",
      matchRet: 1,
      heroGuid: "hero-guid-ana",
      kill: 12,
      assist: 8,
      death: 4,
      heroDamage: 3000,
      cure: 9000,
      beginTs: 1777098388787,
    },
    {
      matchId: "match-2",
      matchRet: 0,
      heroGuid: "hero-guid-ana",
      kill: 8,
      assist: 6,
      death: 6,
      heroDamage: 2800,
      cure: 7000,
      beginTs: 1777097388787,
    },
    {
      matchId: "match-3",
      matchRet: 1,
      heroGuid: "hero-guid-kiriko",
      kill: 10,
      assist: 10,
      death: 5,
      heroDamage: 2600,
      cure: 8000,
      beginTs: 1777096388787,
    },
  ],
};

function buildSnapshot(gameMode: GameMode = "competitive") {
  return buildOverstatsPlayerSnapshot({
    battleTag: "西野七濑#51404",
    gameMode,
    profile,
    matchList,
  });
}

describe("buildOverstatsPlayerSnapshot", () => {
  it("maps Overstats profile and matches into PlayerSnapshot", () => {
    const snapshot = buildSnapshot();

    expect(snapshot.player.id).toBe("517215771");
    expect(snapshot.player.name).toBe("西野七濑#51404");
    expect(snapshot.player.avatar).toBe("https://example.com/avatar.png");
    expect(snapshot.player.title).toBe("纸糊的支援");
    expect(snapshot.player.endorsementLevel).toBe(3);
    expect(snapshot.player.ranks).toEqual([
      { role: "support", division: "Platinum", tier: 5 },
    ]);
    expect(snapshot.query).toEqual({
      battleTag: "西野七濑#51404",
      platform: "pc",
      gameMode: "competitive",
    });
    expect(snapshot.general.gamesPlayed).toBe(12);
    expect(snapshot.general.gamesWon).toBe(6);
    expect(snapshot.general.winrate).toBe(50);
    expect(snapshot.general.totalEliminations).toBe(120);
    expect(snapshot.general.totalAssists).toBe(24);
    expect(snapshot.general.totalDeaths).toBe(60);
    expect(snapshot.general.totalDamage).toBe(38400);
    expect(snapshot.general.totalHealing).toBe(76800);
    expect(snapshot.general.averageEliminations).toBe(10);
    expect(snapshot.general.averageDeaths).toBe(5);
    expect(snapshot.general.averageDamage).toBe(3200);
    expect(snapshot.general.averageHealing).toBe(6400);
    expect(snapshot.topHeroes.map((hero) => hero.hero)).toEqual([
      "hero-guid-ana",
      "hero-guid-kiriko",
    ]);
    expect(snapshot.topHeroes[0]).toMatchObject({
      gamesPlayed: 2,
      gamesWon: 1,
      gamesLost: 1,
      winrate: 50,
      averageEliminations: 10,
      averageDeaths: 5,
      averageDamage: 2900,
      averageHealing: 8000,
    });
  });

  it("falls back to match aggregates when profile mode totals are missing", () => {
    const snapshot = buildOverstatsPlayerSnapshot({
      battleTag: "西野七濑#51404",
      gameMode: "quickplay",
      profile,
      matchList,
    });

    expect(snapshot.general.gamesPlayed).toBe(3);
    expect(snapshot.general.gamesWon).toBe(2);
    expect(snapshot.general.gamesLost).toBe(1);
    expect(snapshot.general.winrate).toBeCloseTo(66.67, 2);
    expect(snapshot.general.totalEliminations).toBe(30);
    expect(snapshot.general.totalAssists).toBe(24);
    expect(snapshot.general.totalDeaths).toBe(15);
  });

  it("keeps malformed profile and match payloads safe", () => {
    const snapshot = buildOverstatsPlayerSnapshot({
      battleTag: "NoData#12345",
      gameMode: "competitive",
      profile: { ok: true },
      matchList: { ok: true, matches: null },
    });

    expect(snapshot.player).toMatchObject({
      id: "NoData#12345",
      name: "NoData#12345",
      avatar: null,
      title: null,
      endorsementLevel: null,
      ranks: [],
      lastUpdatedAt: null,
    });
    expect(snapshot.general.gamesPlayed).toBe(0);
    expect(snapshot.topHeroes).toEqual([]);
  });

  it("maps Dashen hero ids to readable Chinese hero names", () => {
    const snapshot = buildOverstatsPlayerSnapshot({
      battleTag: "西野七濑#51404",
      gameMode: "quickplay",
      profile,
      matchList: {
        ok: true,
        matches: [
          {
            matchRet: 1,
            heroGuid: "207165582859044140",
            kill: 14,
            assist: 0,
            death: 7,
            heroDamage: 6882,
            cure: 0,
          },
          {
            matchRet: 1,
            heroGuid: "207165582859043131",
            kill: 8,
            assist: 12,
            death: 2,
            heroDamage: 3655,
            cure: 10000,
          },
          {
            matchRet: 0,
            heroGuid: "207165582859043779",
            kill: 10,
            assist: 11,
            death: 6,
            heroDamage: 5772,
            cure: 6817,
          },
        ],
      },
    });

    expect(snapshot.topHeroes.map((hero) => hero.hero)).toEqual([
      "死怨",
      "安娜",
      "无漾",
    ]);
  });
});

describe("OverstatsError", () => {
  it("stores api code, message, status, and cause", () => {
    const cause = new Error("network down");
    const error = new OverstatsError("OVERSTATS_UNAVAILABLE", "不可用", {
      status: 503,
      cause,
    });

    expect(error.code).toBe("OVERSTATS_UNAVAILABLE");
    expect(error.status).toBe(503);
    expect(error.cause).toBe(cause);
  });
});

describe("Overstats fetchers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("posts profile requests to Overstats with a BattleTag body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ ok: true }),
    );

    await fetchOverstatsProfile("西野七濑#51404", {
      baseUrl: "http://127.0.0.1:18080",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:18080/api/v2/dashen-profile");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      bnet_id: "西野七濑#51404",
      include_previous_season: true,
      stream: false,
    });
  });

  it("posts match list requests to Overstats with render disabled", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ ok: true }),
    );

    await fetchOverstatsMatchList("西野七濑#51404", {
      baseUrl: "http://127.0.0.1:18080",
      limit: 5,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:18080/api/v2/dashen-match");
    expect(JSON.parse(String(init?.body))).toEqual({
      bnet_id: "西野七濑#51404",
      include_fight: true,
      include_previous_season: true,
      limit: 5,
      render: false,
      stream: false,
    });
  });

  it("maps bnet_not_found responses to PLAYER_NOT_FOUND", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          ok: false,
          error: "bnet_not_found",
          message: "Could not resolve customerToken",
        },
        { status: 404 },
      ),
    );

    await expect(
      fetchOverstatsProfile("Missing#12345", {
        baseUrl: "http://127.0.0.1:18080",
      }),
    ).rejects.toMatchObject({
      code: "PLAYER_NOT_FOUND",
      status: 404,
      message: "没有找到这个国服玩家",
    });
  });

  it("maps missing targets to INVALID_BATTLETAG", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          ok: false,
          error: "missing_target",
          message: "bnet_id or customer_token is required",
        },
        { status: 400 },
      ),
    );

    await expect(
      fetchOverstatsProfile("", {
        baseUrl: "http://127.0.0.1:18080",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_BATTLETAG",
      status: 400,
    });
  });

  it("maps network failures to OVERSTATS_UNAVAILABLE", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    await expect(
      fetchOverstatsProfile("西野七濑#51404", {
        baseUrl: "http://127.0.0.1:18080",
      }),
    ).rejects.toMatchObject({
      code: "OVERSTATS_UNAVAILABLE",
      message: "国服数据服务暂时不可用，请稍后再试",
    });
  });

  it("requires OVERSTATS_BASE_URL", async () => {
    await expect(fetchOverstatsProfile("西野七濑#51404")).rejects.toMatchObject({
      code: "OVERSTATS_UNAVAILABLE",
      message: "缺少 OVERSTATS_BASE_URL，无法查询国服数据。",
    });
  });
});
