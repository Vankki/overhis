import { describe, expect, it } from "vitest";
import {
  buildAnalysisMessages,
  parseAiAnalysis,
} from "./analysisPrompt";
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
