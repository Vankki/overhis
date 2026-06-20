import { describe, expect, it, vi } from "vitest";
import {
  DAILY_LIMIT,
  consumeRateLimit,
  getClientIp,
  getRateLimitStatus,
  getRateLimitKey,
} from "./rateLimit";

function createRedisStub(initial: Record<string, unknown> = {}) {
  const state = new Map(Object.entries(initial));

  return {
    get: vi.fn(async (key: string) => state.get(key) ?? null),
    incr: vi.fn(async (key: string) => {
      const next = Number(state.get(key) ?? 0) + 1;
      state.set(key, next);
      return next;
    }),
    expire: vi.fn(async () => 1),
  };
}

describe("rateLimit", () => {
  it("builds a daily key from ip and UTC date", () => {
    expect(
      getRateLimitKey("1.2.3.4", new Date("2026-06-20T16:30:00.000Z")),
    ).toBe("ow-ai:1.2.3.4:2026-06-20");
  });

  it("reads the first x-forwarded-for IP", () => {
    const headers = new Headers({
      "x-forwarded-for": "8.8.8.8, 1.1.1.1",
    });

    expect(getClientIp(headers)).toBe("8.8.8.8");
  });

  it("falls back to x-real-ip and then unknown", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "7.7.7.7" }))).toBe(
      "7.7.7.7",
    );
    expect(getClientIp(new Headers())).toBe("unknown");
  });

  it("checks common proxy headers before unknown", () => {
    expect(getClientIp(new Headers({ "cf-connecting-ip": "6.6.6.6" }))).toBe(
      "6.6.6.6",
    );
    expect(getClientIp(new Headers({ "true-client-ip": "5.5.5.5" }))).toBe(
      "5.5.5.5",
    );
    expect(getClientIp(new Headers({ "x-client-ip": "4.4.4.4" }))).toBe(
      "4.4.4.4",
    );
  });

  it("reports remaining quota", async () => {
    const now = new Date("2026-06-20T00:00:00.000Z");
    const redis = createRedisStub({ "ow-ai:1.2.3.4:2026-06-20": 3 });

    await expect(getRateLimitStatus(redis, "1.2.3.4", now)).resolves.toEqual({
      limit: DAILY_LIMIT,
      used: 3,
      remaining: 2,
      limited: false,
    });
  });

  it("accepts numeric string counters", async () => {
    const now = new Date("2026-06-20T00:00:00.000Z");
    const redis = createRedisStub({ "ow-ai:1.2.3.4:2026-06-20": "3" });

    await expect(getRateLimitStatus(redis, "1.2.3.4", now)).resolves.toEqual({
      limit: DAILY_LIMIT,
      used: 3,
      remaining: 2,
      limited: false,
    });
  });

  it.each([["nope"], [-1], [Number.POSITIVE_INFINITY], [Number.NaN]])(
    "fails closed for invalid counter value %s",
    async (value) => {
      const now = new Date("2026-06-20T00:00:00.000Z");
      const redis = createRedisStub({ "ow-ai:1.2.3.4:2026-06-20": value });

      await expect(getRateLimitStatus(redis, "1.2.3.4", now)).resolves.toEqual({
        limit: DAILY_LIMIT,
        used: DAILY_LIMIT,
        remaining: 0,
        limited: true,
      });
    },
  );

  it("marks the sixth request as limited before consumption", async () => {
    const now = new Date("2026-06-20T00:00:00.000Z");
    const redis = createRedisStub({ "ow-ai:1.2.3.4:2026-06-20": 5 });

    await expect(getRateLimitStatus(redis, "1.2.3.4", now)).resolves.toEqual({
      limit: DAILY_LIMIT,
      used: 5,
      remaining: 0,
      limited: true,
    });
  });

  it("marks over-limit status as limited", async () => {
    const now = new Date("2026-06-20T00:00:00.000Z");
    const redis = createRedisStub({ "ow-ai:1.2.3.4:2026-06-20": 6 });

    await expect(getRateLimitStatus(redis, "1.2.3.4", now)).resolves.toEqual({
      limit: DAILY_LIMIT,
      used: 6,
      remaining: 0,
      limited: true,
    });
  });

  it("increments quota and sets expiration after success", async () => {
    const now = new Date("2026-06-20T00:00:00.000Z");
    const redis = createRedisStub();

    await expect(consumeRateLimit(redis, "1.2.3.4", now)).resolves.toEqual({
      limit: DAILY_LIMIT,
      used: 1,
      remaining: 4,
      limited: false,
    });
    expect(redis.expire).toHaveBeenCalledWith(
      "ow-ai:1.2.3.4:2026-06-20",
      60 * 60 * 36,
    );
  });

  it("marks the sixth consumed request as limited", async () => {
    const now = new Date("2026-06-20T00:00:00.000Z");
    const redis = createRedisStub({ "ow-ai:1.2.3.4:2026-06-20": 5 });

    await expect(consumeRateLimit(redis, "1.2.3.4", now)).resolves.toEqual({
      limit: DAILY_LIMIT,
      used: 6,
      remaining: 0,
      limited: true,
    });
  });
});
