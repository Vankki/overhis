import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getInvalidBattleTagMessage,
  normalizeBattleTag,
} from "@/lib/battletag";
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
import type {
  AnalyzeErrorResponse,
  AnalyzeSuccessResponse,
} from "@/lib/types";

export const runtime = "nodejs";

const analyzeRequestSchema = z.object({
  battleTag: z.string().trim().min(1),
  platform: z.enum(["pc", "console"]).default("pc"),
  gameMode: z.enum(["competitive", "quickplay"]).default("competitive"),
});

function jsonError(
  response: AnalyzeErrorResponse,
  status: number,
): NextResponse<AnalyzeErrorResponse> {
  return NextResponse.json<AnalyzeErrorResponse>(response, { status });
}

async function readBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const parsed = analyzeRequestSchema.safeParse(await readBody(request));

  if (!parsed.success) {
    return jsonError(
      {
        ok: false,
        code: "INVALID_BATTLETAG",
        message: getInvalidBattleTagMessage(),
      },
      400,
    );
  }

  try {
    const normalized = normalizeBattleTag(parsed.data.battleTag);
    const redis = createRedisClient();
    const ip = getClientIp(request.headers);

    let quota;
    try {
      quota = await getRateLimitStatus(redis, ip);
    } catch {
      return jsonError(
        {
          ok: false,
          code: "RATE_LIMIT_UNAVAILABLE",
          message: "限流服务暂时不可用，请稍后重试。",
        },
        503,
      );
    }

    if (quota.limited) {
      return jsonError(
        {
          ok: false,
          code: "RATE_LIMITED",
          message: "今天这个 IP 的 5 次 AI 分析已经用完，明天再来。",
        },
        429,
      );
    }

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
      const response: AnalyzeSuccessResponse = {
        ok: true,
        snapshot,
        analysis,
        aiError: null,
        quota: consumedQuota,
      };

      return NextResponse.json<AnalyzeSuccessResponse>(response);
    } catch (error) {
      if (error instanceof DeepSeekError) {
        const response: AnalyzeSuccessResponse = {
          ok: true,
          snapshot,
          analysis: null,
          aiError: error.message,
          quota,
        };

        return NextResponse.json<AnalyzeSuccessResponse>(response);
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof OverfastError) {
      return jsonError(
        {
          ok: false,
          code: error.code,
          message: error.message,
        },
        error.code === "PLAYER_NOT_FOUND" ? 404 : 503,
      );
    }

    if (error instanceof Error && error.message === getInvalidBattleTagMessage()) {
      return jsonError(
        {
          ok: false,
          code: "INVALID_BATTLETAG",
          message: error.message,
        },
        400,
      );
    }

    return jsonError(
      {
        ok: false,
        code: "UNKNOWN_ERROR",
        message: "查询失败，请稍后再试。",
      },
      500,
    );
  }
}
