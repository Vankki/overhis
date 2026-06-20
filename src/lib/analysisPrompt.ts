import type { AiAnalysis, PlayerSnapshot } from "./types";

export interface DeepSeekMessage {
  role: "system" | "user";
  content: string;
}

export const FALLBACK_ANALYSIS: AiAnalysis = {
  summary: "AI 总结格式异常，但战绩数据已成功获取。",
  strengths: [],
  weaknesses: [],
  nextSteps: [],
  heroFocus: [],
  roast: "这次 AI 没喷出来，先算你逃过一劫。",
};

const ANALYSIS_FIELDS = [
  "summary",
  "strengths",
  "weaknesses",
  "nextSteps",
  "heroFocus",
  "roast",
] as const;

export function buildAnalysisMessages(
  snapshot: PlayerSnapshot,
): DeepSeekMessage[] {
  return [
    {
      role: "system",
      content: [
        "你是守望先锋战绩分析助手，只根据提供的战绩数据分析。",
        "禁止编造录像、地图、队友、隐藏对局、具体战术回合或任何未提供的比赛细节。",
        "输出必须是合法 JSON，不要 Markdown，不要额外解释。",
        "使用中文，语气直接、具体、 helpful，优先给出能执行的改进建议。",
        "roast 可以尖锐、讽刺、好玩，但只能针对数据和玩法倾向，不能攻击本人，不能包含歧视性称呼、人身攻击、威胁或露骨骚扰。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请分析下面这份玩家战绩快照。",
        "只返回一个 JSON object，字段必须为：summary, strengths, weaknesses, nextSteps, heroFocus, roast。",
        "summary 和 roast 是字符串；strengths, weaknesses, nextSteps, heroFocus 是字符串数组。",
        "roast 要尖锐、讽刺、好玩，但只喷数据和玩法倾向，不喷人。",
        "",
        JSON.stringify(snapshot, null, 2),
      ].join("\n"),
    },
  ];
}

export function parseAiAnalysis(raw: string): AiAnalysis {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      return FALLBACK_ANALYSIS;
    }

    const parsed: unknown = JSON.parse(raw.slice(start, end + 1));

    if (!isRecord(parsed)) {
      return FALLBACK_ANALYSIS;
    }

    return {
      summary: sanitizeString(parsed.summary, FALLBACK_ANALYSIS.summary),
      strengths: sanitizeStringArray(parsed.strengths),
      weaknesses: sanitizeStringArray(parsed.weaknesses),
      nextSteps: sanitizeStringArray(parsed.nextSteps),
      heroFocus: sanitizeStringArray(parsed.heroFocus),
      roast: sanitizeString(parsed.roast, FALLBACK_ANALYSIS.roast),
    };
  } catch {
    return FALLBACK_ANALYSIS;
  }
}

function sanitizeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function isRecord(value: unknown): value is Record<(typeof ANALYSIS_FIELDS)[number], unknown> {
  return typeof value === "object" && value !== null;
}
