import OpenAI from "openai";
import { buildAnalysisMessages, parseAiAnalysis } from "./analysisPrompt";
import type { AiAnalysis, PlayerSnapshot } from "./types";

const DEFAULT_ERROR_MESSAGE =
  "战绩已查到，但 AI 总结暂时生成失败，请稍后重试。";

export class DeepSeekError extends Error {
  constructor(message = DEFAULT_ERROR_MESSAGE, options?: ErrorOptions) {
    super(message, options);
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

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
    });

    const completion = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
      messages: buildAnalysisMessages(snapshot),
      temperature: 0.85,
      max_tokens: 1000,
      response_format: { type: "json_object" },
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

    throw new DeepSeekError(DEFAULT_ERROR_MESSAGE, {
      cause: error,
    });
  }
}
