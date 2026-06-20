import { Redis } from "@upstash/redis";

export const DAILY_LIMIT = 5;
export const RATE_LIMIT_TTL_SECONDS = 60 * 60 * 36;

export interface RedisCounter {
  get<TData = unknown>(key: string): Promise<TData | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number | boolean>;
}

export interface RateLimitStatus {
  limit: number;
  used: number;
  remaining: number;
  limited: boolean;
}

export function createRedisClient(): RedisCounter {
  return Redis.fromEnv();
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  for (const header of [
    "x-real-ip",
    "cf-connecting-ip",
    "true-client-ip",
    "x-client-ip",
  ]) {
    const ip = headers.get(header)?.trim();
    if (ip) {
      return ip;
    }
  }

  // Keep a deterministic fallback so tests and callers can handle missing proxy data.
  return "unknown";
}

export function getRateLimitKey(ip: string, now = new Date()): string {
  const yyyyMmDd = now.toISOString().slice(0, 10);
  return `ow-ai:${ip}:${yyyyMmDd}`;
}

function parseUsedCount(raw: unknown): number {
  const used = typeof raw === "number" ? raw : Number(raw ?? 0);
  return Number.isFinite(used) && used >= 0 ? used : DAILY_LIMIT;
}

export async function getRateLimitStatus(
  redis: RedisCounter,
  ip: string,
  now = new Date(),
): Promise<RateLimitStatus> {
  const key = getRateLimitKey(ip, now);
  const raw = await redis.get(key);
  const used = parseUsedCount(raw);
  const remaining = Math.max(DAILY_LIMIT - used, 0);

  return {
    limit: DAILY_LIMIT,
    used,
    remaining,
    limited: used >= DAILY_LIMIT,
  };
}

export async function consumeRateLimit(
  redis: RedisCounter,
  ip: string,
  now = new Date(),
): Promise<RateLimitStatus> {
  const key = getRateLimitKey(ip, now);
  const used = await redis.incr(key);
  // Date-scoped keys isolate each daily bucket, so extending the TTL on each hit is acceptable.
  await redis.expire(key, RATE_LIMIT_TTL_SECONDS);
  const remaining = Math.max(DAILY_LIMIT - used, 0);

  return {
    limit: DAILY_LIMIT,
    used,
    remaining,
    limited: used > DAILY_LIMIT,
  };
}
