# CN Overstats Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public OverFast flow with a national-server-only Overstats flow, where users enter BattleTag name and numeric suffix separately and the app queries Overstats for Chinese server stats.

**Architecture:** Keep the existing `PlayerSnapshot` response contract so DeepSeek and most of `ResultView` remain stable. Add a focused `src/lib/overstats.ts` client/mapper, update `POST /api/analyze` to use it, and revise UI copy/input controls for the national-server-only product. The feasibility gate is already satisfied: local Overstats returned `ok=true` for both `/api/v2/dashen-profile` and `/api/v2/dashen-match` using `西野七濑#51404`.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.4, TypeScript, Vitest, Testing Library, DeepSeek via `openai`, Upstash Redis.

---

## File Structure

- Modify `src/lib/types.ts`: add `OVERSTATS_UNAVAILABLE`, keep existing snapshot fields compatible.
- Modify `src/lib/battletag.ts`: accept full-width `＃`, improve national-server input error text while preserving `Name#12345` normalization.
- Modify `src/lib/battletag.test.ts`: cover full-width separator and national-server validation.
- Create `src/lib/overstats.ts`: Overstats fetch helpers, `OverstatsError`, response mappers, `buildOverstatsPlayerSnapshot`.
- Create `src/lib/overstats.test.ts`: test request bodies, error mapping, snapshot mapping, safe defaults.
- Modify `src/app/api/analyze/route.ts`: remove OverFast calls from the active path, call Overstats profile/match, keep quota and DeepSeek behavior.
- Modify `src/app/api/analyze/route.test.ts`: mock Overstats instead of OverFast and cover national-server errors.
- Modify `src/lib/analysisPrompt.ts` and `src/lib/analysisPrompt.test.ts`: make prompt explicitly say the snapshot is Chinese server / NetEase Dashen data.
- Modify `src/components/Analyzer.tsx`: split BattleTag into name and number fields, fixed `#`, remove platform selector, keep game mode selector.
- Create or modify `src/components/Analyzer.test.tsx`: verify split inputs submit `name#number`.
- Modify `src/components/ResultView.tsx`: display `国服 · 竞技/快速` instead of platform.
- Modify `.env.example` and `README.md`: document `OVERSTATS_BASE_URL` and separate Overstats credential safety.

---

### Task 1: Baseline And Next Documentation

**Files:**
- Read: `AGENTS.md`
- Read: `node_modules/next/dist/docs/`
- Verify: `package.json`

- [ ] **Step 1: Install dependencies if needed**

Run:

```powershell
npm install
```

Expected: dependencies installed and `node_modules/next/dist/docs/` exists.

- [ ] **Step 2: Read relevant Next.js docs**

Run:

```powershell
Get-ChildItem -Path node_modules\next\dist\docs -Recurse -File | Select-Object -First 20 -ExpandProperty FullName
```

Then read the App Router route handler and environment variable docs available under `node_modules/next/dist/docs/`. If filenames differ in this Next build, use `rg -n "Route Handlers|environment variables|NextResponse" node_modules\next\dist\docs`.

Expected: know the current Next 16 route handler and env-var guidance before changing `src/app/api/analyze/route.ts`.

- [ ] **Step 3: Run baseline tests**

Run:

```powershell
npm test
```

Expected: current suite passes before code changes. If it fails because dependencies are missing or environment differs, investigate before proceeding.

- [ ] **Step 4: Commit plan**

Run:

```powershell
git add docs/superpowers/plans/2026-06-21-cn-overstats-only.md
git commit -m "docs: plan cn overstats only implementation"
```

Expected: plan committed.

---

### Task 2: BattleTag Normalization

**Files:**
- Modify: `src/lib/battletag.ts`
- Test: `src/lib/battletag.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests:

```ts
it("normalizes a full-width separator copied from Chinese input", () => {
  expect(normalizeBattleTag("西野七濑＃51404")).toEqual({
    display: "西野七濑#51404",
    playerId: "西野七濑#51404",
  });
});

it("returns a national-server input message for missing numeric suffix", () => {
  expect(() => normalizeBattleTag("西野七濑#")).toThrow(
    "国服 BattleTag 格式不对，请输入玩家昵称和数字编号。",
  );
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test -- src/lib/battletag.test.ts
```

Expected: new tests fail because full-width `＃` is not normalized and the old OverFast player id uses hyphen.

- [ ] **Step 3: Implement minimal normalization**

Update `normalizeBattleTag` to replace `＃` with `#`, keep `display` as `Name#12345`, and set `playerId` to the same national-server BattleTag string. Update `INVALID_BATTLETAG_MESSAGE` to `国服 BattleTag 格式不对，请输入玩家昵称和数字编号。`.

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
npm test -- src/lib/battletag.test.ts
```

Expected: BattleTag tests pass.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/lib/battletag.ts src/lib/battletag.test.ts
git commit -m "feat: normalize national server battletags"
```

---

### Task 3: Overstats Client And Snapshot Mapper

**Files:**
- Create: `src/lib/overstats.ts`
- Test: `src/lib/overstats.test.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write failing tests for snapshot mapping**

Create tests with fixtures shaped like Overstats responses:

```ts
it("maps Overstats profile and matches into PlayerSnapshot", () => {
  const snapshot = buildOverstatsPlayerSnapshot({
    battleTag: "西野七濑#51404",
    gameMode: "competitive",
    profile,
    matchList,
  });

  expect(snapshot.player.id).toBe("517215771");
  expect(snapshot.player.name).toBe("西野七濑#51404");
  expect(snapshot.query.platform).toBe("pc");
  expect(snapshot.query.gameMode).toBe("competitive");
  expect(snapshot.player.avatar).toBe("https://example.com/avatar.png");
  expect(snapshot.general.gamesPlayed).toBe(12);
  expect(snapshot.general.winrate).toBe(50);
  expect(snapshot.topHeroes[0].hero).toBe("hero-guid-ana");
});
```

Also test `healer -> support`, missing fields default to zero, and `OverstatsError` stores `code/status`.

- [ ] **Step 2: Write failing tests for fetch helpers**

Mock `globalThis.fetch` and assert:

```ts
await fetchOverstatsProfile("西野七濑#51404", { baseUrl: "http://127.0.0.1:18080" });
expect(fetchMock).toHaveBeenCalledWith(
  "http://127.0.0.1:18080/api/v2/dashen-profile",
  expect.objectContaining({
    method: "POST",
    headers: expect.objectContaining({ accept: "application/json" }),
  }),
);
```

Assert 404 `bnet_not_found` maps to `PLAYER_NOT_FOUND` and network failures map to `OVERSTATS_UNAVAILABLE`.

- [ ] **Step 3: Run tests and verify RED**

Run:

```powershell
npm test -- src/lib/overstats.test.ts
```

Expected: fails because `src/lib/overstats.ts` does not exist.

- [ ] **Step 4: Implement minimal client and mapper**

Implement:

```ts
export class OverstatsError extends Error {
  code: ApiErrorCode;
  status?: number;
}

export async function fetchOverstatsProfile(battleTag: string, options?: OverstatsFetchOptions): Promise<unknown>
export async function fetchOverstatsMatchList(battleTag: string, options?: OverstatsFetchOptions): Promise<unknown>
export function buildOverstatsPlayerSnapshot(input: BuildOverstatsPlayerSnapshotInput): PlayerSnapshot
```

Use defensive `asRecord`, `asNumber`, `asStringOrNull`, map `competitive` to `sport`, `quickplay` to `leisure`, and aggregate matches by `heroGuid`.

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```powershell
npm test -- src/lib/overstats.test.ts
```

Expected: Overstats tests pass.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/lib/types.ts src/lib/overstats.ts src/lib/overstats.test.ts
git commit -m "feat: add overstats snapshot mapper"
```

---

### Task 4: API Route Switch

**Files:**
- Modify: `src/app/api/analyze/route.ts`
- Test: `src/app/api/analyze/route.test.ts`

- [ ] **Step 1: Update route tests first**

Mock `@/lib/overstats`:

```ts
vi.mock("@/lib/overstats", () => ({
  OverstatsError: mocks.OverstatsError,
  buildOverstatsPlayerSnapshot: mocks.buildOverstatsPlayerSnapshot,
  fetchOverstatsMatchList: mocks.fetchOverstatsMatchList,
  fetchOverstatsProfile: mocks.fetchOverstatsProfile,
}));
```

Change success expectation to:

```ts
expect(mocks.fetchOverstatsProfile).toHaveBeenCalledWith("TeKrop#2217");
expect(mocks.fetchOverstatsMatchList).toHaveBeenCalledWith("TeKrop#2217");
```

Add a 503 test for `OVERSTATS_UNAVAILABLE`.

- [ ] **Step 2: Run route tests and verify RED**

Run:

```powershell
npm test -- src/app/api/analyze/route.test.ts
```

Expected: fails because route still imports OverFast.

- [ ] **Step 3: Implement route switch**

Replace OverFast imports with Overstats imports. Remove `platform` from request schema. Keep `gameMode`. Fetch profile and matches concurrently:

```ts
const [profile, matchList] = await Promise.all([
  fetchOverstatsProfile(normalized.playerId),
  fetchOverstatsMatchList(normalized.playerId),
]);
```

Build snapshot via `buildOverstatsPlayerSnapshot`.

- [ ] **Step 4: Run route tests and verify GREEN**

Run:

```powershell
npm test -- src/app/api/analyze/route.test.ts
```

Expected: route tests pass.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/app/api/analyze/route.ts src/app/api/analyze/route.test.ts
git commit -m "feat: switch analyze api to overstats"
```

---

### Task 5: Prompt And UI

**Files:**
- Modify: `src/lib/analysisPrompt.ts`
- Modify: `src/lib/analysisPrompt.test.ts`
- Modify: `src/components/Analyzer.tsx`
- Create: `src/components/Analyzer.test.tsx`
- Modify: `src/components/ResultView.tsx`

- [ ] **Step 1: Write prompt test**

Add:

```ts
expect(messages[0].content).toContain("国服");
expect(messages[0].content).toContain("网易大神");
```

- [ ] **Step 2: Run prompt test and verify RED**

Run:

```powershell
npm test -- src/lib/analysisPrompt.test.ts
```

Expected: fails until prompt mentions national-server data.

- [ ] **Step 3: Update prompt**

Add a system rule: `这份 snapshot 来自守望先锋国服/网易大神数据源。`

- [ ] **Step 4: Write Analyzer behavior test**

Render `Analyzer`, type `西野七濑` in the name input and `51404` in the number input, submit, and assert fetch body contains:

```json
{"battleTag":"西野七濑#51404","gameMode":"competitive"}
```

- [ ] **Step 5: Run Analyzer test and verify RED**

Run:

```powershell
npm test -- src/components/Analyzer.test.tsx
```

Expected: fails because current UI has one BattleTag field and sends platform.

- [ ] **Step 6: Implement UI changes**

Split state into `battleTagName` and `battleTagNumber`, render fixed `#`, remove platform selector and `platform` from request body, update copy to national-server wording.

- [ ] **Step 7: Update ResultView**

Change platform label display to:

```ts
const serverLabel = "国服";
...
{player.title || "公开生涯资料"} · {serverLabel} · {modeLabel}
```

- [ ] **Step 8: Run focused tests and verify GREEN**

Run:

```powershell
npm test -- src/lib/analysisPrompt.test.ts src/components/Analyzer.test.tsx
```

Expected: prompt and UI tests pass.

- [ ] **Step 9: Commit**

Run:

```powershell
git add src/lib/analysisPrompt.ts src/lib/analysisPrompt.test.ts src/components/Analyzer.tsx src/components/Analyzer.test.tsx src/components/ResultView.tsx
git commit -m "feat: update national server analysis ui"
```

---

### Task 6: Docs, Environment, And Full Verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Update docs**

Add:

```text
OVERSTATS_BASE_URL=http://127.0.0.1:18080
```

Document that `DASHEN_ROLE_ID` and `DASHEN_TOKEN` belong in the separate Overstats service configuration, not in the Next.js repo or chat.

- [ ] **Step 2: Run full tests**

Run:

```powershell
npm test
```

Expected: all Vitest files pass.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm run build
```

Expected: Next build exits 0.

- [ ] **Step 4: Commit docs and verification checkpoint**

Run:

```powershell
git add .env.example README.md
git commit -m "docs: document overstats setup"
```

If verification revealed code fixes, include those code files in the final commit with a precise message.

---

## Self-Review

- Spec coverage: national-server-only input, Overstats API calls, snapshot mapping, prompt, rate limit behavior, UI copy, and docs are covered.
- Placeholder scan: no task uses placeholder language; code snippets define concrete expected behavior.
- Type consistency: the plan consistently uses `buildOverstatsPlayerSnapshot`, `fetchOverstatsProfile`, `fetchOverstatsMatchList`, `OverstatsError`, `GameMode`, and existing `PlayerSnapshot`.
