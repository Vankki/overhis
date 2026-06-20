# Overwatch AI Stats Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public Next.js website where users enter an Overwatch BattleTag, fetch public OverFast stats, and receive a DeepSeek-powered Chinese analysis with a playful sharp roast.

**Architecture:** Use a single Next.js App Router application deployed on Vercel. The browser calls `POST /api/analyze`; that route validates input, checks Upstash Redis for same-IP daily quota, fetches OverFast data, transforms it into a compact snapshot, calls DeepSeek, then returns display data and structured analysis.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Vitest, `openai` SDK with DeepSeek `baseURL`, `@upstash/redis`, `zod`, Vercel.

---

## Context Notes

- Target project root: `C:\code\overhis`.
- GitHub target: `https://github.com/Vankki/overhis`.
- The directory contains this implementation plan under `docs/`, so scaffold Next.js in a temporary sibling directory and copy the generated project files back into `C:\code\overhis`.
- There is no git repository yet, so the first task initializes git.
- There is no `.codegraph/` directory, so CodeGraph is not available for this project yet.
- GitHub CLI is installed, but the current machine is not logged into GitHub yet. Publishing requires `gh auth login` with the `Vankki` account.
- DeepSeek docs checked: OpenAI-compatible Chat Completions via `https://api.deepseek.com`.
- Next.js docs checked: App Router route handlers export `POST(request)` and can return `NextResponse.json(...)`.
- Upstash docs checked: `@upstash/redis` can use `Redis.fromEnv()`, `redis.get`, `redis.incr`, and `redis.expire`.

## File Structure

Create this structure under `C:\code\overhis`:

```text
.
├── .env.example
├── README.md
├── docs/
│   └── superpowers/
│       └── plans/
│           └── 2026-06-20-overwatch-ai-stats-web-implementation.md
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── analyze/
│   │   │       └── route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── Analyzer.tsx
│   │   └── ResultView.tsx
│   └── lib/
│       ├── analysisPrompt.test.ts
│       ├── analysisPrompt.ts
│       ├── battletag.test.ts
│       ├── battletag.ts
│       ├── deepseek.ts
│       ├── overfast.test.ts
│       ├── overfast.ts
│       ├── rateLimit.test.ts
│       ├── rateLimit.ts
│       └── types.ts
└── vitest.config.ts
```

Responsibilities:

- `src/lib/types.ts`: shared request, response, snapshot, and analysis types.
- `src/lib/battletag.ts`: BattleTag validation and `#` to `-` normalization.
- `src/lib/rateLimit.ts`: IP extraction, Redis key construction, quota checks, quota consumption.
- `src/lib/overfast.ts`: OverFast HTTP calls and raw-to-snapshot transformation.
- `src/lib/analysisPrompt.ts`: DeepSeek prompt construction and AI response parsing.
- `src/lib/deepseek.ts`: DeepSeek client wrapper.
- `src/app/api/analyze/route.ts`: API orchestration.
- `src/components/Analyzer.tsx`: client-side form and request state.
- `src/components/ResultView.tsx`: stat cards and AI output rendering.

---

### Task 1: Initialize the Next.js Project

**Files:**
- Create through CLI: `C:\code\overhis\package.json`
- Create through CLI: `C:\code\overhis\src\app\page.tsx`
- Create through CLI: `C:\code\overhis\src\app\layout.tsx`
- Create through CLI: `C:\code\overhis\src\app\globals.css`
- Create through CLI: `C:\code\overhis\.gitignore`
- Modify: `C:\code\overhis\package.json`

- [ ] **Step 1: Initialize git**

Run:

```powershell
cd C:\code\overhis
git init
```

Expected: git creates `.git`.

- [ ] **Step 2: Scaffold the app in a temporary directory**

Run:

```powershell
$tempPath = "C:\code\overhis-next-template"
if (Test-Path $tempPath) { Remove-Item -Recurse -Force $tempPath }
cd C:\code
npx create-next-app@latest overhis-next-template --ts --eslint --app --src-dir --tailwind --import-alias "@/*" --use-npm
```

If the CLI asks about Turbopack, choose the default.

Expected: a working Next.js project appears under `C:\code\overhis-next-template`.

- [ ] **Step 3: Copy scaffolded files into the project root**

Run:

```powershell
cd C:\code\overhis-next-template
Get-ChildItem -Force | Where-Object { $_.Name -ne ".git" } | ForEach-Object {
  Copy-Item -Recurse -Force -LiteralPath $_.FullName -Destination "C:\code\overhis"
}
cd C:\code
Remove-Item -Recurse -Force C:\code\overhis-next-template
```

Expected: generated Next.js files are copied into `C:\code\overhis` while `docs\superpowers\plans\2026-06-20-overwatch-ai-stats-web-implementation.md` remains in place.

- [ ] **Step 4: Install runtime dependencies**

Run:

```powershell
cd C:\code\overhis
npm install openai @upstash/redis zod clsx
```

Expected: dependencies are added to `package.json`.

- [ ] **Step 5: Install test dependencies**

Run:

```powershell
cd C:\code\overhis
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: dev dependencies are added to `package.json`.

- [ ] **Step 6: Add test scripts**

Modify `C:\code\overhis\package.json` so the `scripts` section includes these entries while keeping the scripts created by Next.js:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

If `next lint` is not present in the generated project, keep the generated lint script and add only `test` and `test:watch`.

- [ ] **Step 7: Create Vitest config**

Create `C:\code\overhis\vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 8: Verify the empty app**

Run:

```powershell
cd C:\code\overhis
npm run build
npm test
```

Expected: build passes; tests report no test files or pass if the generated project already includes tests.

- [ ] **Step 9: Commit initialization**

Run:

```powershell
cd C:\code\overhis
git add .
git commit -m "chore: initialize next app"
```

Expected: commit succeeds.

---

### Task 2: Add Shared Types

**Files:**
- Create: `C:\code\overhis\src\lib\types.ts`

- [ ] **Step 1: Create shared type definitions**

Create `C:\code\overhis\src\lib\types.ts`:

```ts
export type Platform = "pc" | "console";

export type GameMode = "competitive" | "quickplay";

export type ApiErrorCode =
  | "INVALID_BATTLETAG"
  | "RATE_LIMITED"
  | "PLAYER_NOT_FOUND"
  | "PROFILE_PRIVATE"
  | "OVERFAST_UNAVAILABLE"
  | "DEEPSEEK_UNAVAILABLE"
  | "RATE_LIMIT_UNAVAILABLE"
  | "UNKNOWN_ERROR";

export interface AnalyzeRequest {
  battleTag: string;
  platform: Platform;
  gameMode: GameMode;
}

export interface AiAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
  heroFocus: string[];
  roast: string;
}

export interface HeroSnapshot {
  hero: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  timePlayedSeconds: number;
  winrate: number;
  kda: number;
  averageEliminations: number;
  averageDeaths: number;
  averageDamage: number;
  averageHealing: number;
}

export interface PlayerRank {
  role: "tank" | "damage" | "support" | "open";
  division: string;
  tier: number;
}

export interface PlayerSnapshot {
  player: {
    id: string;
    name: string;
    avatar: string | null;
    title: string | null;
    endorsementLevel: number | null;
    ranks: PlayerRank[];
    lastUpdatedAt: string | null;
  };
  query: {
    battleTag: string;
    platform: Platform;
    gameMode: GameMode;
  };
  general: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    timePlayedSeconds: number;
    winrate: number;
    kda: number;
    totalEliminations: number;
    totalAssists: number;
    totalDeaths: number;
    totalDamage: number;
    totalHealing: number;
    averageEliminations: number;
    averageAssists: number;
    averageDeaths: number;
    averageDamage: number;
    averageHealing: number;
  };
  roles: Record<string, PlayerSnapshot["general"]>;
  topHeroes: HeroSnapshot[];
}

export interface AnalyzeSuccessResponse {
  ok: true;
  snapshot: PlayerSnapshot;
  analysis: AiAnalysis | null;
  aiError: string | null;
  quota: {
    limit: number;
    used: number;
    remaining: number;
  };
}

export interface AnalyzeErrorResponse {
  ok: false;
  code: ApiErrorCode;
  message: string;
}

export type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse;
```

- [ ] **Step 2: Run typecheck through build**

Run:

```powershell
cd C:\code\overhis
npm run build
```

Expected: build passes.

- [ ] **Step 3: Commit shared types**

Run:

```powershell
cd C:\code\overhis
git add src/lib/types.ts
git commit -m "chore: add shared analysis types"
```

Expected: commit succeeds.

---

### Task 3: Implement BattleTag Normalization

**Files:**
- Create: `C:\code\overhis\src\lib\battletag.test.ts`
- Create: `C:\code\overhis\src\lib\battletag.ts`

- [ ] **Step 1: Write failing tests**

Create `C:\code\overhis\src\lib\battletag.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeBattleTag } from "./battletag";

describe("normalizeBattleTag", () => {
  it("converts a BattleTag with # into an OverFast player id", () => {
    expect(normalizeBattleTag(" TeKrop#2217 ")).toEqual({
      display: "TeKrop#2217",
      playerId: "TeKrop-2217",
    });
  });

  it("accepts non-ASCII player names", () => {
    expect(normalizeBattleTag("源氏玩家#12345")).toEqual({
      display: "源氏玩家#12345",
      playerId: "源氏玩家-12345",
    });
  });

  it("rejects hyphen-only ids because users should enter BattleTag format", () => {
    expect(() => normalizeBattleTag("TeKrop-2217")).toThrow(
      "BattleTag 格式不对，请输入类似 TeKrop#2217 的格式。",
    );
  });

  it("rejects empty names and non-numeric discriminators", () => {
    expect(() => normalizeBattleTag("#2217")).toThrow(
      "BattleTag 格式不对，请输入类似 TeKrop#2217 的格式。",
    );
    expect(() => normalizeBattleTag("TeKrop#abc")).toThrow(
      "BattleTag 格式不对，请输入类似 TeKrop#2217 的格式。",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
cd C:\code\overhis
npm test -- src/lib/battletag.test.ts
```

Expected: FAIL because `src/lib/battletag.ts` does not exist.

- [ ] **Step 3: Implement normalization**

Create `C:\code\overhis\src\lib\battletag.ts`:

```ts
const INVALID_BATTLETAG_MESSAGE =
  "BattleTag 格式不对，请输入类似 TeKrop#2217 的格式。";

export interface NormalizedBattleTag {
  display: string;
  playerId: string;
}

export function normalizeBattleTag(input: string): NormalizedBattleTag {
  const trimmed = input.trim();
  const match = trimmed.match(/^(.+?)#(\d{3,8})$/u);

  if (!match || !match[1].trim()) {
    throw new Error(INVALID_BATTLETAG_MESSAGE);
  }

  const name = match[1].trim();
  const discriminator = match[2];

  return {
    display: `${name}#${discriminator}`,
    playerId: `${name}-${discriminator}`,
  };
}

export function getInvalidBattleTagMessage(): string {
  return INVALID_BATTLETAG_MESSAGE;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
cd C:\code\overhis
npm test -- src/lib/battletag.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit BattleTag normalization**

Run:

```powershell
cd C:\code\overhis
git add src/lib/battletag.ts src/lib/battletag.test.ts
git commit -m "feat: normalize battle tags"
```

Expected: commit succeeds.

---

### Task 4: Implement Redis Rate Limiting

**Files:**
- Create: `C:\code\overhis\src\lib\rateLimit.test.ts`
- Create: `C:\code\overhis\src\lib\rateLimit.ts`

- [ ] **Step 1: Write failing tests**

Create `C:\code\overhis\src\lib\rateLimit.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  DAILY_LIMIT,
  consumeRateLimit,
  getClientIp,
  getRateLimitStatus,
  getRateLimitKey,
} from "./rateLimit";

function createRedisStub(initial: Record<string, number> = {}) {
  const state = new Map(Object.entries(initial));

  return {
    get: vi.fn(async (key: string) => state.get(key) ?? null),
    incr: vi.fn(async (key: string) => {
      const next = (state.get(key) ?? 0) + 1;
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
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
cd C:\code\overhis
npm test -- src/lib/rateLimit.test.ts
```

Expected: FAIL because `src/lib/rateLimit.ts` does not exist.

- [ ] **Step 3: Implement rate limiting**

Create `C:\code\overhis\src\lib\rateLimit.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
cd C:\code\overhis
npm test -- src/lib/rateLimit.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit rate limiting**

Run:

```powershell
cd C:\code\overhis
git add src/lib/rateLimit.ts src/lib/rateLimit.test.ts
git commit -m "feat: add daily ip rate limit"
```

Expected: commit succeeds.

---

### Task 5: Implement OverFast Data Fetching and Snapshot Transformation

**Files:**
- Create: `C:\code\overhis\src\lib\overfast.test.ts`
- Create: `C:\code\overhis\src\lib\overfast.ts`

- [ ] **Step 1: Write failing transformation tests**

Create `C:\code\overhis\src\lib\overfast.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
cd C:\code\overhis
npm test -- src/lib/overfast.test.ts
```

Expected: FAIL because `src/lib/overfast.ts` does not exist.

- [ ] **Step 3: Implement OverFast client and transformer**

Create `C:\code\overhis\src\lib\overfast.ts`:

```ts
import type {
  ApiErrorCode,
  GameMode,
  HeroSnapshot,
  Platform,
  PlayerRank,
  PlayerSnapshot,
} from "./types";

const OVERFAST_BASE_URL = "https://overfast-api.tekrop.fr";
const DEFAULT_TIMEOUT_MS = 10_000;

export class OverfastError extends Error {
  code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "OverfastError";
    this.code = code;
  }
}

interface FetchJsonOptions {
  timeoutMs?: number;
}

async function fetchJson<TData>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<TData> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new OverfastError("PLAYER_NOT_FOUND", "没有找到这个玩家，请检查 BattleTag 是否正确。");
    }

    if (!response.ok) {
      throw new OverfastError("OVERFAST_UNAVAILABLE", "战绩数据源暂时不稳定，请稍后再试。");
    }

    return (await response.json()) as TData;
  } catch (error) {
    if (error instanceof OverfastError) {
      throw error;
    }

    throw new OverfastError("OVERFAST_UNAVAILABLE", "战绩数据源暂时不稳定，请稍后再试。");
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPlayerSummary(playerId: string): Promise<unknown> {
  const encodedPlayerId = encodeURIComponent(playerId);
  return fetchJson(`${OVERFAST_BASE_URL}/players/${encodedPlayerId}/summary`);
}

export async function fetchPlayerStatsSummary(
  playerId: string,
  gameMode: GameMode,
  platform: Platform,
): Promise<unknown> {
  const encodedPlayerId = encodeURIComponent(playerId);
  const search = new URLSearchParams({
    gamemode: gameMode,
    platform,
  });

  return fetchJson(
    `${OVERFAST_BASE_URL}/players/${encodedPlayerId}/stats/summary?${search.toString()}`,
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function mapGeneral(value: unknown): PlayerSnapshot["general"] {
  const record = asRecord(value);
  const total = asRecord(record.total);
  const average = asRecord(record.average);

  return {
    gamesPlayed: asNumber(record.games_played),
    gamesWon: asNumber(record.games_won),
    gamesLost: asNumber(record.games_lost),
    timePlayedSeconds: asNumber(record.time_played),
    winrate: asNumber(record.winrate),
    kda: asNumber(record.kda),
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
  const root = asRecord(summary);
  const competitive = asRecord(root.competitive);
  const platformRanks = asRecord(competitive[platform]);
  const roles: PlayerRank["role"][] = ["tank", "damage", "support", "open"];

  return roles.flatMap((role) => {
    const rank = asRecord(platformRanks[role]);
    const division = asStringOrNull(rank.division);
    const tier = asNumber(rank.tier);

    if (!division || tier <= 0) {
      return [];
    }

    return [{ role, division, tier }];
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
      const record = asRecord(value);
      const average = asRecord(record.average);

      return {
        hero,
        gamesPlayed: asNumber(record.games_played),
        gamesWon: asNumber(record.games_won),
        gamesLost: asNumber(record.games_lost),
        timePlayedSeconds: asNumber(record.time_played),
        winrate: asNumber(record.winrate),
        kda: asNumber(record.kda),
        averageEliminations: asNumber(average.eliminations),
        averageDeaths: asNumber(average.deaths),
        averageDamage: asNumber(average.damage),
        averageHealing: asNumber(average.healing),
      };
    })
    .filter((hero) => hero.timePlayedSeconds > 0 || hero.gamesPlayed > 0)
    .sort((a, b) => b.timePlayedSeconds - a.timePlayedSeconds)
    .slice(0, 5);
}

export function buildPlayerSnapshot(input: {
  playerId: string;
  battleTag: string;
  platform: Platform;
  gameMode: GameMode;
  summary: unknown;
  stats: unknown;
}): PlayerSnapshot {
  const summary = asRecord(input.summary);

  return {
    player: {
      id: input.playerId,
      name: asStringOrNull(summary.username) ?? input.battleTag.split("#")[0] ?? input.battleTag,
      avatar: asStringOrNull(summary.avatar),
      title: asStringOrNull(summary.title),
      endorsementLevel: asNumber(asRecord(summary.endorsement).level) || null,
      ranks: extractRanks(input.summary, input.platform),
      lastUpdatedAt:
        typeof summary.last_updated_at === "number"
          ? new Date(summary.last_updated_at * 1000).toISOString()
          : null,
    },
    query: {
      battleTag: input.battleTag,
      platform: input.platform,
      gameMode: input.gameMode,
    },
    general: mapGeneral(asRecord(input.stats).general),
    roles: extractRoles(input.stats),
    topHeroes: extractTopHeroes(input.stats),
  };
}
```

- [ ] **Step 4: Run transformation tests**

Run:

```powershell
cd C:\code\overhis
npm test -- src/lib/overfast.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit OverFast module**

Run:

```powershell
cd C:\code\overhis
git add src/lib/overfast.ts src/lib/overfast.test.ts
git commit -m "feat: map overfast stats"
```

Expected: commit succeeds.

---

### Task 6: Implement DeepSeek Prompting and Response Parsing

**Files:**
- Create: `C:\code\overhis\src\lib\analysisPrompt.test.ts`
- Create: `C:\code\overhis\src\lib\analysisPrompt.ts`
- Create: `C:\code\overhis\src\lib\deepseek.ts`

- [ ] **Step 1: Write failing prompt and parser tests**

Create `C:\code\overhis\src\lib\analysisPrompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildAnalysisMessages, parseAiAnalysis } from "./analysisPrompt";
import type { PlayerSnapshot } from "./types";

const snapshot: PlayerSnapshot = {
  player: {
    id: "TeKrop-2217",
    name: "TeKrop",
    avatar: null,
    title: "Data Broker",
    endorsementLevel: 2,
    ranks: [{ role: "support", division: "silver", tier: 4 }],
    lastUpdatedAt: "2026-05-05T00:00:00.000Z",
  },
  query: {
    battleTag: "TeKrop#2217",
    platform: "pc",
    gameMode: "competitive",
  },
  general: {
    gamesPlayed: 19,
    gamesWon: 6,
    gamesLost: 13,
    timePlayedSeconds: 12164,
    winrate: 31.58,
    kda: 1.71,
    totalEliminations: 185,
    totalAssists: 54,
    totalDeaths: 140,
    totalDamage: 87194,
    totalHealing: 176745,
    averageEliminations: 9.13,
    averageAssists: 2.66,
    averageDeaths: 6.91,
    averageDamage: 4300.92,
    averageHealing: 8718.1,
  },
  roles: {},
  topHeroes: [],
};

describe("buildAnalysisMessages", () => {
  it("asks for fixed Chinese JSON sections and includes the snapshot", () => {
    const messages = buildAnalysisMessages(snapshot);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("只根据提供的战绩数据分析");
    expect(messages[1].content).toContain("TeKrop#2217");
    expect(messages[1].content).toContain("roast");
  });
});

describe("parseAiAnalysis", () => {
  it("parses strict JSON", () => {
    const parsed = parseAiAnalysis(
      JSON.stringify({
        summary: "偏支援位，数据波动明显。",
        strengths: ["治疗量还行"],
        weaknesses: ["死亡偏多"],
        nextSteps: ["先活下来"],
        heroFocus: ["安娜"],
        roast: "这个胜率像是在和匹配系统冷战。",
      }),
    );

    expect(parsed.roast).toBe("这个胜率像是在和匹配系统冷战。");
    expect(parsed.weaknesses).toEqual(["死亡偏多"]);
  });

  it("parses JSON wrapped in a markdown fence", () => {
    const parsed = parseAiAnalysis(`\`\`\`json
{
  "summary": "一句话",
  "strengths": ["优势"],
  "weaknesses": ["短板"],
  "nextSteps": ["建议"],
  "heroFocus": ["英雄"],
  "roast": "锐评"
}
\`\`\``);

    expect(parsed.summary).toBe("一句话");
    expect(parsed.heroFocus).toEqual(["英雄"]);
  });

  it("uses safe defaults for malformed responses", () => {
    const parsed = parseAiAnalysis("not json");

    expect(parsed.summary).toBe("AI 总结格式异常，但战绩数据已成功获取。");
    expect(parsed.roast).toBe("这次 AI 没喷出来，先算你逃过一劫。");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
cd C:\code\overhis
npm test -- src/lib/analysisPrompt.test.ts
```

Expected: FAIL because `analysisPrompt.ts` does not exist.

- [ ] **Step 3: Implement prompt and parser**

Create `C:\code\overhis\src\lib\analysisPrompt.ts`:

```ts
import type { AiAnalysis, PlayerSnapshot } from "./types";

export interface DeepSeekMessage {
  role: "system" | "user";
  content: string;
}

const FALLBACK_ANALYSIS: AiAnalysis = {
  summary: "AI 总结格式异常，但战绩数据已成功获取。",
  strengths: ["基础战绩已经成功读取，可以先参考数据卡片。"],
  weaknesses: ["AI 输出没有形成完整结构，本次不做具体判断。"],
  nextSteps: ["稍后重新生成一次，或者先根据胜率、KDA 和常用英雄做自查。"],
  heroFocus: ["优先查看你使用时间最长且胜率最低的英雄。"],
  roast: "这次 AI 没喷出来，先算你逃过一劫。",
};

export function buildAnalysisMessages(snapshot: PlayerSnapshot): DeepSeekMessage[] {
  return [
    {
      role: "system",
      content:
        "你是一个守望先锋战绩分析助手。只根据提供的战绩数据分析，不要编造录像、地图、队友、隐藏对局或玩家现实情况。输出必须是合法 JSON，不要输出 Markdown。语气中文、直接、有帮助。",
    },
    {
      role: "user",
      content: `请分析下面的守望先锋战绩数据，输出 JSON 对象，字段必须是：
{
  "summary": "一句话画像",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["短板1", "短板2"],
  "nextSteps": ["下次排位建议1", "下次排位建议2", "下次排位建议3"],
  "heroFocus": ["适合练的英雄或打法方向1", "适合练的英雄或打法方向2"],
  "roast": "锐评"
}

要求：
- summary 控制在 40 字以内。
- strengths、weaknesses、nextSteps 每项要结合具体数据。
- heroFocus 不确定时给打法方向，不要硬编英雄。
- roast 要犀利、阴阳怪气、有节目效果，但只吐槽数据和打法倾向，不攻击玩家本人，不使用脏话、歧视、威胁或人身羞辱。
- 不要输出 JSON 以外的文字。

战绩数据：
${JSON.stringify(snapshot, null, 2)}`,
    },
  ];
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());

  return items.length > 0 ? items : fallback;
}

function extractJson(raw: string): string {
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return raw;
  }

  return raw.slice(firstBrace, lastBrace + 1);
}

export function parseAiAnalysis(raw: string): AiAnalysis {
  try {
    const parsed = JSON.parse(extractJson(raw)) as Record<string, unknown>;

    return {
      summary: asString(parsed.summary, FALLBACK_ANALYSIS.summary),
      strengths: asStringArray(parsed.strengths, FALLBACK_ANALYSIS.strengths),
      weaknesses: asStringArray(parsed.weaknesses, FALLBACK_ANALYSIS.weaknesses),
      nextSteps: asStringArray(parsed.nextSteps, FALLBACK_ANALYSIS.nextSteps),
      heroFocus: asStringArray(parsed.heroFocus, FALLBACK_ANALYSIS.heroFocus),
      roast: asString(parsed.roast, FALLBACK_ANALYSIS.roast),
    };
  } catch {
    return FALLBACK_ANALYSIS;
  }
}
```

- [ ] **Step 4: Create DeepSeek client**

Create `C:\code\overhis\src\lib\deepseek.ts`:

```ts
import OpenAI from "openai";
import { buildAnalysisMessages, parseAiAnalysis } from "./analysisPrompt";
import type { AiAnalysis, PlayerSnapshot } from "./types";

export class DeepSeekError extends Error {
  constructor(message = "战绩已查到，但 AI 总结暂时生成失败，请稍后重试。") {
    super(message);
    this.name = "DeepSeekError";
  }
}

export async function generateAiAnalysis(
  snapshot: PlayerSnapshot,
  apiKey = process.env.DEEPSEEK_API_KEY,
): Promise<AiAnalysis> {
  if (!apiKey) {
    throw new DeepSeekError("缺少 DeepSeek API Key，无法生成 AI 总结。");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
      messages: buildAnalysisMessages(snapshot),
      temperature: 0.85,
      stream: false,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new DeepSeekError();
    }

    return parseAiAnalysis(content);
  } catch (error) {
    if (error instanceof DeepSeekError) {
      throw error;
    }

    throw new DeepSeekError();
  }
}
```

- [ ] **Step 5: Run prompt tests**

Run:

```powershell
cd C:\code\overhis
npm test -- src/lib/analysisPrompt.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run build**

Run:

```powershell
cd C:\code\overhis
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit DeepSeek prompt module**

Run:

```powershell
cd C:\code\overhis
git add src/lib/analysisPrompt.ts src/lib/analysisPrompt.test.ts src/lib/deepseek.ts
git commit -m "feat: add deepseek analysis prompt"
```

Expected: commit succeeds.

---

### Task 7: Implement the Analyze API Route

**Files:**
- Create: `C:\code\overhis\src\app\api\analyze\route.ts`

- [ ] **Step 1: Create API route**

Create `C:\code\overhis\src\app\api\analyze\route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getInvalidBattleTagMessage, normalizeBattleTag } from "@/lib/battletag";
import { DeepSeekError, generateAiAnalysis } from "@/lib/deepseek";
import {
  buildPlayerSnapshot,
  fetchPlayerStatsSummary,
  fetchPlayerSummary,
  OverfastError,
} from "@/lib/overfast";
import {
  consumeRateLimit,
  createRedisClient,
  getClientIp,
  getRateLimitStatus,
} from "@/lib/rateLimit";
import type { AnalyzeErrorResponse, AnalyzeSuccessResponse } from "@/lib/types";

export const runtime = "nodejs";

const analyzeSchema = z.object({
  battleTag: z.string().trim().min(1),
  platform: z.enum(["pc", "console"]).default("pc"),
  gameMode: z.enum(["competitive", "quickplay"]).default("competitive"),
});

function jsonError(
  code: AnalyzeErrorResponse["code"],
  message: string,
  status: number,
) {
  return NextResponse.json<AnalyzeErrorResponse>(
    { ok: false, code, message },
    { status },
  );
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const parsed = analyzeSchema.safeParse(await readBody(request));

  if (!parsed.success) {
    return jsonError("INVALID_BATTLETAG", getInvalidBattleTagMessage(), 400);
  }

  let normalized: ReturnType<typeof normalizeBattleTag>;

  try {
    normalized = normalizeBattleTag(parsed.data.battleTag);
  } catch (error) {
    return jsonError(
      "INVALID_BATTLETAG",
      error instanceof Error ? error.message : getInvalidBattleTagMessage(),
      400,
    );
  }

  const redis = createRedisClient();
  const ip = getClientIp(request.headers);

  let quota = {
    limit: 5,
    used: 0,
    remaining: 5,
    limited: false,
  };

  try {
    quota = await getRateLimitStatus(redis, ip);
  } catch {
    return jsonError(
      "RATE_LIMIT_UNAVAILABLE",
      "限流服务暂时不可用，请稍后重试。",
      503,
    );
  }

  if (quota.limited) {
    return jsonError("RATE_LIMITED", "今天这个 IP 的 5 次 AI 分析已经用完，明天再来。", 429);
  }

  try {
    const [summary, stats] = await Promise.all([
      fetchPlayerSummary(normalized.playerId),
      fetchPlayerStatsSummary(
        normalized.playerId,
        parsed.data.gameMode,
        parsed.data.platform,
      ),
    ]);

    const snapshot = buildPlayerSnapshot({
      playerId: normalized.playerId,
      battleTag: normalized.display,
      platform: parsed.data.platform,
      gameMode: parsed.data.gameMode,
      summary,
      stats,
    });

    try {
      const analysis = await generateAiAnalysis(snapshot);
      const consumedQuota = await consumeRateLimit(redis, ip);

      return NextResponse.json<AnalyzeSuccessResponse>({
        ok: true,
        snapshot,
        analysis,
        aiError: null,
        quota: {
          limit: consumedQuota.limit,
          used: consumedQuota.used,
          remaining: consumedQuota.remaining,
        },
      });
    } catch (error) {
      const message =
        error instanceof DeepSeekError
          ? error.message
          : "战绩已查到，但 AI 总结暂时生成失败，请稍后重试。";

      return NextResponse.json<AnalyzeSuccessResponse>({
        ok: true,
        snapshot,
        analysis: null,
        aiError: message,
        quota: {
          limit: quota.limit,
          used: quota.used,
          remaining: quota.remaining,
        },
      });
    }
  } catch (error) {
    if (error instanceof OverfastError) {
      const status = error.code === "PLAYER_NOT_FOUND" ? 404 : 503;
      return jsonError(error.code, error.message, status);
    }

    return jsonError("UNKNOWN_ERROR", "查询失败，请稍后再试。", 500);
  }
}
```

- [ ] **Step 2: Run lint, tests, and build**

Run:

```powershell
cd C:\code\overhis
npm test
npm run build
```

Expected: tests pass and build passes.

- [ ] **Step 3: Commit API route**

Run:

```powershell
cd C:\code\overhis
git add src/app/api/analyze/route.ts
git commit -m "feat: add stats analysis api"
```

Expected: commit succeeds.

---

### Task 8: Build the Client UI

**Files:**
- Create: `C:\code\overhis\src\components\Analyzer.tsx`
- Create: `C:\code\overhis\src\components\ResultView.tsx`
- Modify: `C:\code\overhis\src\app\page.tsx`

- [ ] **Step 1: Create result renderer**

Create `C:\code\overhis\src\components\ResultView.tsx`:

```tsx
import type { AiAnalysis, AnalyzeSuccessResponse, PlayerRank } from "@/lib/types";

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("zh-CN");
}

function formatTime(iso: string | null): string {
  if (!iso) {
    return "未知";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function formatRank(rank: PlayerRank): string {
  const roleMap: Record<PlayerRank["role"], string> = {
    tank: "坦克",
    damage: "输出",
    support: "支援",
    open: "开放队列",
  };

  return `${roleMap[rank.role]} ${rank.division} ${rank.tier}`;
}

function AnalysisList(props: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <h3 className="text-sm font-semibold text-slate-100">{props.title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
        {props.items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </section>
  );
}

function AnalysisCard(props: { analysis: AiAnalysis | null; aiError: string | null }) {
  if (!props.analysis) {
    return (
      <section className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-5 text-sm text-amber-100">
        {props.aiError ?? "战绩已查到，但 AI 总结暂时生成失败，请稍后重试。"}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
          一句话画像
        </p>
        <p className="mt-3 text-lg font-semibold leading-8 text-white">
          {props.analysis.summary}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AnalysisList title="优势" items={props.analysis.strengths} />
        <AnalysisList title="短板" items={props.analysis.weaknesses} />
        <AnalysisList title="下次排位建议" items={props.analysis.nextSteps} />
        <AnalysisList title="适合练的英雄/打法方向" items={props.analysis.heroFocus} />
      </div>

      <div className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-200">
          锐评
        </p>
        <p className="mt-3 text-base leading-8 text-rose-50">{props.analysis.roast}</p>
      </div>
    </section>
  );
}

export function ResultView(props: { result: AnalyzeSuccessResponse }) {
  const { snapshot, analysis, aiError, quota } = props.result;
  const ranks = snapshot.player.ranks.length
    ? snapshot.player.ranks.map(formatRank).join(" / ")
    : "未定级或未公开";

  const copyText = [
    `玩家：${snapshot.player.name}`,
    `胜率：${formatPercent(snapshot.general.winrate)} KDA：${snapshot.general.kda.toFixed(2)}`,
    analysis ? `画像：${analysis.summary}` : "",
    analysis ? `锐评：${analysis.roast}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {snapshot.player.avatar ? (
            <img
              alt={`${snapshot.player.name} avatar`}
              className="h-20 w-20 rounded-lg border border-white/10 object-cover"
              src={snapshot.player.avatar}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-2xl font-bold">
              {snapshot.player.name.slice(0, 1)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-bold text-white">{snapshot.player.name}</h2>
            <p className="mt-1 text-sm text-slate-300">{snapshot.player.title ?? "无称号"}</p>
            <p className="mt-2 text-sm text-cyan-200">{ranks}</p>
            <p className="mt-1 text-xs text-slate-400">
              数据更新时间：{formatTime(snapshot.player.lastUpdatedAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["胜率", formatPercent(snapshot.general.winrate)],
          ["KDA", snapshot.general.kda.toFixed(2)],
          ["场次", formatNumber(snapshot.general.gamesPlayed)],
          ["场均死亡", snapshot.general.averageDeaths.toFixed(1)],
          ["场均伤害", formatNumber(snapshot.general.averageDamage)],
          ["场均治疗", formatNumber(snapshot.general.averageHealing)],
          ["总击杀", formatNumber(snapshot.general.totalEliminations)],
          ["总治疗", formatNumber(snapshot.general.totalHealing)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </section>

      {snapshot.topHeroes.length > 0 ? (
        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-sm font-semibold text-slate-100">常用英雄</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {snapshot.topHeroes.map((hero) => (
              <div key={hero.hero} className="rounded-lg bg-black/20 p-4">
                <p className="text-base font-semibold capitalize text-white">{hero.hero}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {hero.gamesPlayed} 场 · 胜率 {formatPercent(hero.winrate)} · KDA{" "}
                  {hero.kda.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <AnalysisCard analysis={analysis} aiError={aiError} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          onClick={() => navigator.clipboard.writeText(copyText)}
          type="button"
        >
          复制总结
        </button>
        <p className="text-sm text-slate-400">
          今日本 IP 已用 {quota.used}/{quota.limit} 次，剩余 {quota.remaining} 次。
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create analyzer form**

Create `C:\code\overhis\src\components\Analyzer.tsx`:

```tsx
"use client";

import { FormEvent, useState } from "react";
import { ResultView } from "./ResultView";
import type { AnalyzeResponse, AnalyzeSuccessResponse, GameMode, Platform } from "@/lib/types";

const initialBattleTag = "";

export function Analyzer() {
  const [battleTag, setBattleTag] = useState(initialBattleTag);
  const [platform, setPlatform] = useState<Platform>("pc");
  const [gameMode, setGameMode] = useState<GameMode>("competitive");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeSuccessResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ battleTag, platform, gameMode }),
      });

      const payload = (await response.json()) as AnalyzeResponse;

      if (!payload.ok) {
        setError(payload.message);
        setResult(null);
        return;
      }

      setResult(payload);
    } catch {
      setError("网络请求失败，请稍后再试。");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-1 flex-col justify-center">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Overwatch Stats AI
          </p>
          <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
            守望先锋战绩总结
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            输入 BattleTag，自动查询公开战绩，用 AI 给出中文分析、排位建议，以及一点不太客气但很诚实的锐评。
          </p>
        </div>

        <form
          className="mt-8 rounded-lg border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-cyan-950/30 sm:p-5"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_160px_160px_auto]">
            <label className="block">
              <span className="text-sm font-medium text-slate-200">BattleTag</span>
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:ring-2"
                onChange={(event) => setBattleTag(event.target.value)}
                placeholder="TeKrop#2217"
                value={battleTag}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">平台</span>
              <select
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none ring-cyan-300/40 focus:ring-2"
                onChange={(event) => setPlatform(event.target.value as Platform)}
                value={platform}
              >
                <option value="pc">PC</option>
                <option value="console">主机</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">模式</span>
              <select
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none ring-cyan-300/40 focus:ring-2"
                onChange={(event) => setGameMode(event.target.value as GameMode)}
                value={gameMode}
              >
                <option value="competitive">竞技</option>
                <option value="quickplay">快速</option>
              </select>
            </label>

            <button
              className="self-end rounded-lg bg-cyan-300 px-5 py-3 text-base font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "生成中..." : "生成战绩总结"}
            </button>
          </div>

          <p className="mt-4 text-xs leading-6 text-slate-400">
            只支持公开生涯资料。同一 IP 每天最多生成 5 次 AI 分析，失败的数据查询不会扣次数。
          </p>
        </form>

        {loading ? (
          <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.04] p-6 text-slate-300">
            正在查战绩和召唤 AI 教练，稍等一下。
          </div>
        ) : null}

        {error ? (
          <div className="mt-8 rounded-lg border border-rose-300/30 bg-rose-300/10 p-5 text-rose-100">
            {error}
          </div>
        ) : null}

        {result ? <ResultView result={result} /> : null}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Replace homepage**

Modify `C:\code\overhis\src\app\page.tsx`:

```tsx
import { Analyzer } from "@/components/Analyzer";

export default function Home() {
  return <Analyzer />;
}
```

- [ ] **Step 4: Run build**

Run:

```powershell
cd C:\code\overhis
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit client UI**

Run:

```powershell
cd C:\code\overhis
git add src/app/page.tsx src/components/Analyzer.tsx src/components/ResultView.tsx
git commit -m "feat: build analysis page"
```

Expected: commit succeeds.

---

### Task 9: Polish Styling and Metadata

**Files:**
- Modify: `C:\code\overhis\src\app\globals.css`
- Modify: `C:\code\overhis\src\app\layout.tsx`

- [ ] **Step 1: Replace global styles**

Modify `C:\code\overhis\src\app\globals.css`:

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
  background: #020617;
}

body {
  min-height: 100%;
  margin: 0;
  background:
    radial-gradient(circle at top left, rgba(34, 211, 238, 0.18), transparent 32rem),
    radial-gradient(circle at bottom right, rgba(244, 63, 94, 0.14), transparent 28rem),
    #020617;
  color: #e2e8f0;
}

button,
input,
select {
  font: inherit;
}
```

- [ ] **Step 2: Set metadata**

Modify `C:\code\overhis\src\app\layout.tsx` so it exports this metadata and renders children:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "守望先锋战绩 AI 总结",
  description: "查询公开守望先锋战绩，并用 AI 生成中文分析和锐评。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Run build**

Run:

```powershell
cd C:\code\overhis
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit styling**

Run:

```powershell
cd C:\code\overhis
git add src/app/globals.css src/app/layout.tsx
git commit -m "style: polish landing page"
```

Expected: commit succeeds.

---

### Task 10: Add Environment and Deployment Documentation

**Files:**
- Create: `C:\code\overhis\.env.example`
- Modify: `C:\code\overhis\README.md`

- [ ] **Step 1: Add environment example**

Create `C:\code\overhis\.env.example`:

```text
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

- [ ] **Step 2: Replace README**

Modify `C:\code\overhis\README.md`:

```md
# Overhis

Overhis is a public Overwatch stats analysis website. Users enter a BattleTag, the app fetches public OverFast stats, and DeepSeek generates a Chinese analysis with practical advice and a sharp roast.

## Features

- BattleTag lookup in `Name#1234` format.
- PC and console platform selector.
- Competitive and quickplay mode selector.
- Public profile stats from OverFast.
- DeepSeek AI analysis.
- Same-IP daily limit of 5 successful AI analyses.

## Local Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Fill `.env.local` with:

```text
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_MODEL=deepseek-v4-flash
UPSTASH_REDIS_REST_URL=your_upstash_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token
```

Open `http://localhost:3000`.

## Tests

```powershell
npm test
npm run build
```

## Deployment

Deploy to Vercel and add these environment variables in the Vercel project settings:

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

The app can use the default Vercel domain for the first public release.

## External Dependencies

- OverFast API for public Overwatch career data.
- DeepSeek API for AI analysis.
- Upstash Redis for per-IP daily quota.
```

- [ ] **Step 3: Run tests and build**

Run:

```powershell
cd C:\code\overhis
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit docs**

Run:

```powershell
cd C:\code\overhis
git add .env.example README.md
git commit -m "docs: add setup and deployment notes"
```

Expected: commit succeeds.

---

### Task 11: Manual Local Verification

**Files:**
- No code changes unless a previous task fails verification.

- [ ] **Step 1: Create `.env.local`**

Run:

```powershell
cd C:\code\overhis
Copy-Item .env.example .env.local
```

Then edit `C:\code\overhis\.env.local` with real DeepSeek and Upstash credentials.

- [ ] **Step 2: Start dev server**

Run:

```powershell
cd C:\code\overhis
npm run dev
```

Expected: Next.js starts on `http://localhost:3000`.

- [ ] **Step 3: Verify happy path**

Open `http://localhost:3000` and submit:

```text
TeKrop#2217
```

Expected:

- Player card renders.
- Stats cards render.
- AI sections render, including `锐评`.
- Quota text shows `今日本 IP 已用 1/5 次`.

- [ ] **Step 4: Verify invalid BattleTag**

Submit:

```text
TeKrop-2217
```

Expected:

```text
BattleTag 格式不对，请输入类似 TeKrop#2217 的格式。
```

- [ ] **Step 5: Verify rate limit**

Submit the same valid BattleTag until five successful AI responses are returned, then submit once more.

Expected sixth response:

```text
今天这个 IP 的 5 次 AI 分析已经用完，明天再来。
```

- [ ] **Step 6: Verify production build**

Stop the dev server and run:

```powershell
cd C:\code\overhis
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit verification fixes if needed**

If verification required code changes, commit those specific files:

```powershell
cd C:\code\overhis
git add <changed-files>
git commit -m "fix: resolve local verification issues"
```

Expected: commit succeeds only if files changed.

---

### Task 12: Publish to GitHub under Vankki

**Files:**
- No code changes unless deployment metadata needs a fix.

- [ ] **Step 1: Confirm GitHub CLI authentication**

Run:

```powershell
cd C:\code\overhis
gh auth status
```

Expected if already logged in:

```text
Logged in to github.com account Vankki
```

If the command says you are not logged in, run:

```powershell
gh auth login
```

Choose GitHub.com, HTTPS, browser authentication, then log in as `Vankki`. After login, rerun:

```powershell
gh auth status
```

Expected: the active account is `Vankki`.

- [ ] **Step 2: Confirm working tree is clean**

Run:

```powershell
cd C:\code\overhis
git status -sb
```

Expected:

```text
## main
```

If the branch is `master`, rename it:

```powershell
git branch -M main
```

Expected after rename:

```powershell
git status -sb
```

```text
## main
```

- [ ] **Step 3: Check whether `Vankki/overhis` already exists**

Run:

```powershell
gh repo view Vankki/overhis --json nameWithOwner,url,visibility
```

Expected if it exists: JSON containing `"nameWithOwner":"Vankki/overhis"`.

If it does not exist, the command exits with an error. Continue to Step 4.

- [ ] **Step 4: Create or connect the GitHub repository**

If `Vankki/overhis` does not exist, create it as a public repository and add it as `origin`:

```powershell
cd C:\code\overhis
gh repo create Vankki/overhis --public --source . --remote origin --description "Overwatch stats AI analysis website"
```

Expected: GitHub creates `https://github.com/Vankki/overhis` and local git remote `origin`.

If `Vankki/overhis` already exists, add it as the remote:

```powershell
cd C:\code\overhis
git remote add origin https://github.com/Vankki/overhis.git
```

If `origin` already exists but points somewhere else, inspect it first:

```powershell
git remote -v
```

Then update only if it is safe:

```powershell
git remote set-url origin https://github.com/Vankki/overhis.git
```

- [ ] **Step 5: Push `main`**

Run:

```powershell
cd C:\code\overhis
git push -u origin main
```

Expected: branch `main` is pushed to `Vankki/overhis`.

- [ ] **Step 6: Verify repository URL**

Run:

```powershell
gh repo view Vankki/overhis --web
```

Expected: browser opens `https://github.com/Vankki/overhis`.

- [ ] **Step 7: Commit any publish metadata fixes if needed**

If publishing required a small metadata change, commit that change:

```powershell
cd C:\code\overhis
git add <changed-files>
git commit -m "chore: update repository metadata"
git push
```

Expected: commit and push succeed only if files changed.

---

## Self-Review

Spec coverage:

- Public website on Vercel: covered by Tasks 1, 8, 9, and 10.
- DeepSeek AI summary: covered by Tasks 6 and 7.
- Same-IP daily limit of 5: covered by Tasks 4 and 7.
- OverFast data source: covered by Task 5.
- Fixed AI sections including `锐评`: covered by Tasks 6 and 8.
- Clear Chinese errors: covered by Tasks 3, 5, and 7.
- Mobile-first page: covered by Tasks 8 and 9.
- No login, history, leaderboard, or bot integration: preserved by file structure and task scope.
- GitHub destination under `Vankki`: covered by Task 12.

Placeholder scan:

- No placeholder markers or unfinished implementation steps are present.
- Every code-writing step includes concrete file content.
- Every verification step includes exact commands and expected outcomes.

Type consistency:

- `AnalyzeSuccessResponse`, `AiAnalysis`, `PlayerSnapshot`, `Platform`, and `GameMode` are defined once in `src/lib/types.ts`.
- Later tasks import these types without renaming them.
- `normalizeBattleTag`, `buildPlayerSnapshot`, `generateAiAnalysis`, and rate-limit functions match the names used by the API route.
