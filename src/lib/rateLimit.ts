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

  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function getRateLimitKey(ip: string, now = new Date()): string {
  const yyyyMmDd = now.toISOString().slice(0, 10);
  return `ow-ai:${ip}:${yyyyMmDd}`;
}

export async function getRateLimitStatus(
  redis: RedisCounter,
  ip: string,
  now = new Date(),
): Promise<RateLimitStatus> {
  const key = getRateLimitKey(ip, now);
  const raw = await redis.get<number>(key);
  const used = typeof raw === "number" ? raw : Number(raw ?? 0);
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
  await redis.expire(key, RATE_LIMIT_TTL_SECONDS);
  const remaining = Math.max(DAILY_LIMIT - used, 0);

  return {
    limit: DAILY_LIMIT,
    used,
    remaining,
    limited: used > DAILY_LIMIT,
  };
}
