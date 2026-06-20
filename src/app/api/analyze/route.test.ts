import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiAnalysis, PlayerSnapshot } from "@/lib/types";

const mocks = vi.hoisted(() => {
  class MockDeepSeekError extends Error {
    constructor(message = "AI failed") {
      super(message);
      this.name = "DeepSeekError";
    }
  }

  class MockOverfastError extends Error {
    code: string;
    status?: number;

    constructor(
      code: string,
      message: string,
      options: { status?: number } = {},
    ) {
      super(message);
      this.name = "OverfastError";
      this.code = code;
      this.status = options.status;
    }
  }

  return {
    redis: {},
    DeepSeekError: MockDeepSeekError,
    OverfastError: MockOverfastError,
    generateAiAnalysis: vi.fn(),
    buildPlayerSnapshot: vi.fn(),
    fetchPlayerStatsSummary: vi.fn(),
    fetchPlayerSummary: vi.fn(),
    consumeRateLimit: vi.fn(),
    createRedisClient: vi.fn(),
    getClientIp: vi.fn(),
    getRateLimitStatus: vi.fn(),
  };
});

vi.mock("@/lib/deepseek", () => ({
  DeepSeekError: mocks.DeepSeekError,
  generateAiAnalysis: mocks.generateAiAnalysis,
}));

vi.mock("@/lib/overfast", () => ({
  OverfastError: mocks.OverfastError,
  buildPlayerSnapshot: mocks.buildPlayerSnapshot,
  fetchPlayerStatsSummary: mocks.fetchPlayerStatsSummary,
  fetchPlayerSummary: mocks.fetchPlayerSummary,
}));

vi.mock("@/lib/rateLimit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  createRedisClient: mocks.createRedisClient,
  getClientIp: mocks.getClientIp,
  getRateLimitStatus: mocks.getRateLimitStatus,
}));

const { POST } = await import("./route");

const snapshot: PlayerSnapshot = {
  player: {
    id: "TeKrop-2217",
    name: "TeKrop",
    avatar: null,
    title: null,
    endorsementLevel: null,
    ranks: [],
    lastUpdatedAt: null,
  },
  query: {
    battleTag: "TeKrop#2217",
    platform: "pc",
    gameMode: "competitive",
  },
  general: {
    gamesPlayed: 10,
    gamesWon: 6,
    gamesLost: 4,
    timePlayedSeconds: 3600,
    winrate: 60,
    kda: 2,
    totalEliminations: 100,
    totalAssists: 50,
    totalDeaths: 50,
    totalDamage: 10000,
    totalHealing: 5000,
    averageEliminations: 10,
    averageAssists: 5,
    averageDeaths: 5,
    averageDamage: 1000,
    averageHealing: 500,
  },
  roles: {},
  topHeroes: [],
};

const analysis: AiAnalysis = {
  summary: "打得还行。",
  strengths: ["稳定"],
  weaknesses: ["失误偏多"],
  nextSteps: ["少送"],
  heroFocus: ["ana"],
  roast: "别把复活点当家。",
};

const availableQuota = {
  limit: 5,
  used: 0,
  remaining: 5,
  limited: false,
};

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.createRedisClient.mockReturnValue(mocks.redis);
  mocks.getClientIp.mockReturnValue("1.2.3.4");
  mocks.getRateLimitStatus.mockResolvedValue(availableQuota);
  mocks.fetchPlayerSummary.mockResolvedValue({ username: "TeKrop" });
  mocks.fetchPlayerStatsSummary.mockResolvedValue({ general: {} });
  mocks.buildPlayerSnapshot.mockReturnValue(snapshot);
  mocks.generateAiAnalysis.mockResolvedValue(analysis);
  mocks.consumeRateLimit.mockResolvedValue({
    limit: 5,
    used: 1,
    remaining: 4,
    limited: false,
  });
});

describe("POST /api/analyze", () => {
  it("returns 400 INVALID_BATTLETAG for an invalid BattleTag", async () => {
    const response = await POST(createRequest({ battleTag: "TeKrop-2217" }));

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      ok: false,
      code: "INVALID_BATTLETAG",
      message: "BattleTag 格式不对，请输入类似 TeKrop#2217 的格式。",
    });
    expect(mocks.createRedisClient).not.toHaveBeenCalled();
  });

  it("returns 404 for OverFast PLAYER_NOT_FOUND without AI or quota consumption", async () => {
    mocks.fetchPlayerSummary.mockRejectedValue(
      new mocks.OverfastError("PLAYER_NOT_FOUND", "没有找到这个玩家", {
        status: 404,
      }),
    );

    const response = await POST(createRequest({ battleTag: "TeKrop#2217" }));

    expect(response.status).toBe(404);
    expect(await readJson(response)).toEqual({
      ok: false,
      code: "PLAYER_NOT_FOUND",
      message: "没有找到这个玩家",
    });
    expect(mocks.generateAiAnalysis).not.toHaveBeenCalled();
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  it("returns snapshot and aiError without consuming quota when DeepSeek fails", async () => {
    mocks.generateAiAnalysis.mockRejectedValue(
      new mocks.DeepSeekError("AI 暂时不可用"),
    );

    const response = await POST(createRequest({ battleTag: "TeKrop#2217" }));

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      ok: true,
      snapshot,
      analysis: null,
      aiError: "AI 暂时不可用",
      quota: availableQuota,
    });
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  it("consumes quota after successful AI generation and returns consumed quota", async () => {
    const consumedQuota = {
      limit: 5,
      used: 3,
      remaining: 2,
      limited: false,
    };
    mocks.consumeRateLimit.mockResolvedValue(consumedQuota);

    const response = await POST(
      createRequest({
        battleTag: "TeKrop#2217",
        platform: "console",
        gameMode: "quickplay",
      }),
    );

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      ok: true,
      snapshot,
      analysis,
      aiError: null,
      quota: consumedQuota,
    });
    expect(mocks.fetchPlayerStatsSummary).toHaveBeenCalledWith(
      "TeKrop-2217",
      "quickplay",
      "console",
    );
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith(mocks.redis, "1.2.3.4");
  });

  it("returns 429 RATE_LIMITED with consumed quota when consumption crosses the limit", async () => {
    const consumedQuota = {
      limit: 5,
      used: 6,
      remaining: 0,
      limited: true,
    };
    mocks.consumeRateLimit.mockResolvedValue(consumedQuota);

    const response = await POST(createRequest({ battleTag: "TeKrop#2217" }));

    expect(response.status).toBe(429);
    expect(await readJson(response)).toEqual({
      ok: false,
      code: "RATE_LIMITED",
      message: "今天这个 IP 的 5 次 AI 分析已经用完，明天再来。",
      quota: consumedQuota,
    });
  });

  it("returns 503 RATE_LIMIT_UNAVAILABLE when quota consumption fails", async () => {
    mocks.consumeRateLimit.mockRejectedValue(new Error("redis unavailable"));

    const response = await POST(createRequest({ battleTag: "TeKrop#2217" }));

    expect(response.status).toBe(503);
    expect(await readJson(response)).toEqual({
      ok: false,
      code: "RATE_LIMIT_UNAVAILABLE",
      message: "限流服务暂时不可用，请稍后重试。",
    });
  });
});
