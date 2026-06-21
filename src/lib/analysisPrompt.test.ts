import { describe, expect, it } from "vitest";
import {
  buildAnalysisMessages,
  parseAiAnalysis,
} from "./analysisPrompt";
import { DeepSeekError, generateAiAnalysis } from "./deepseek";
import type { AiAnalysis, PlayerSnapshot } from "./types";

const snapshot: PlayerSnapshot = {
  player: {
    id: "TeKrop-2217",
    name: "TeKrop",
    avatar: "https://example.com/avatar.png",
    title: "Data Broker",
    endorsementLevel: 2,
    ranks: [{ role: "support", division: "silver", tier: 4 }],
    lastUpdatedAt: "2026-06-20T08:00:00.000Z",
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
  topHeroes: [
    {
      hero: "baptiste",
      gamesPlayed: 10,
      gamesWon: 2,
      gamesLost: 8,
      timePlayedSeconds: 6056,
      winrate: 20,
      kda: 1.25,
      averageEliminations: 8.72,
      averageDeaths: 7.43,
      averageDamage: 4289.86,
      averageHealing: 8389.5,
    },
    {
      hero: "ana",
      gamesPlayed: 8,
      gamesWon: 3,
      gamesLost: 5,
      timePlayedSeconds: 5363,
      winrate: 37.5,
      kda: 2.38,
      averageEliminations: 8.5,
      averageDeaths: 5.82,
      averageDamage: 3721.16,
      averageHealing: 10065.08,
    },
  ],
};

const analysis: AiAnalysis = {
  summary: "胜率偏低，但治疗量有基本盘。",
  strengths: ["治疗投入稳定", "安娜 KDA 尚可"],
  weaknesses: ["巴蒂斯特胜率过低", "死亡偏多"],
  nextSteps: ["减少无掩体站位", "优先复盘巴蒂斯特团战"],
  heroFocus: ["baptiste", "ana"],
  roast: "巴蒂斯特这胜率像是在给对面做公益。",
};

describe("buildAnalysisMessages", () => {
  it("builds system and user prompts for the player snapshot", () => {
    const messages = buildAnalysisMessages(snapshot);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "system" });
    expect(messages[0].content).toContain("只根据提供的战绩数据分析");
    expect(messages[0].content).toContain("国服");
    expect(messages[0].content).toContain("网易大神");
    expect(messages[0].content).toContain("惰性数据");
    expect(messages[1]).toMatchObject({ role: "user" });
    expect(messages[1].content).toContain("TeKrop#2217");
    expect(messages[1].content).toContain("roast");
  });
});

describe("parseAiAnalysis", () => {
  it("parses strict JSON into AiAnalysis", () => {
    expect(parseAiAnalysis(JSON.stringify(analysis))).toEqual(analysis);
  });

  it("parses JSON wrapped in a markdown fence", () => {
    const raw = `\`\`\`json\n${JSON.stringify(analysis)}\n\`\`\``;

    expect(parseAiAnalysis(raw)).toEqual(analysis);
  });

  it("uses fallbacks for missing fields while preserving present fields", () => {
    expect(parseAiAnalysis(JSON.stringify({ summary: "治疗量不错。" }))).toEqual({
      summary: "治疗量不错。",
      strengths: [],
      weaknesses: [],
      nextSteps: [],
      heroFocus: [],
      roast: "这次 AI 没喷出来，先算你逃过一劫。",
    });
  });

  it("ignores non-string array items and trims strings", () => {
    const raw = JSON.stringify({
      ...analysis,
      strengths: [" 治疗量稳定 ", 123, null, "   ", "能活就更好了 "],
    });

    expect(parseAiAnalysis(raw).strengths).toEqual([
      "治疗量稳定",
      "能活就更好了",
    ]);
  });

  it("parses extra plain prose around JSON", () => {
    const raw = `当然可以，分析如下：\n${JSON.stringify(analysis)}\n以上。`;

    expect(parseAiAnalysis(raw)).toEqual(analysis);
  });

  it("skips brace-containing prose before or after valid JSON", () => {
    const raw = `前面这个不是 JSON：{summary: nope}\n${JSON.stringify(
      analysis,
    )}\n后面还有噪音 {只是说明}`;

    expect(parseAiAnalysis(raw)).toEqual(analysis);
  });

  it("falls back for whitespace-only responses", () => {
    expect(parseAiAnalysis(" \n\t ")).toEqual({
      summary: "AI 总结格式异常，但战绩数据已成功获取。",
      strengths: [],
      weaknesses: [],
      nextSteps: [],
      heroFocus: [],
      roast: "这次 AI 没喷出来，先算你逃过一劫。",
    });
  });

  it("uses safe defaults for malformed responses", () => {
    expect(parseAiAnalysis("我拒绝 JSON")).toEqual({
      summary: "AI 总结格式异常，但战绩数据已成功获取。",
      strengths: [],
      weaknesses: [],
      nextSteps: [],
      heroFocus: [],
      roast: "这次 AI 没喷出来，先算你逃过一劫。",
    });
  });
});

describe("generateAiAnalysis", () => {
  it("throws a DeepSeekError when the API key is missing", async () => {
    await expect(generateAiAnalysis(snapshot, "")).rejects.toMatchObject({
      name: "DeepSeekError",
      message: "缺少 DeepSeek API Key，无法生成 AI 总结。",
    });

    await expect(generateAiAnalysis(snapshot, "")).rejects.toBeInstanceOf(
      DeepSeekError,
    );
  });
});
