"use client";

import { FormEvent, useState } from "react";
import { ResultView } from "@/components/ResultView";
import type {
  AnalyzeResponse,
  AnalyzeSuccessResponse,
  GameMode,
  Platform,
} from "@/lib/types";

export function Analyzer() {
  const [battleTag, setBattleTag] = useState("");
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
        headers: {
          "Content-Type": "application/json",
        },
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
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Overwatch AI Review
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              守望先锋生涯数据分析
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
              输入公开 BattleTag，拉取生涯数据并生成一份能直接行动的排位复盘。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto] lg:items-end">
            <label className="min-w-0">
              <span className="text-sm font-medium text-zinc-700">BattleTag</span>
              <input
                value={battleTag}
                onChange={(event) => setBattleTag(event.target.value)}
                placeholder="TeKrop#2217"
                className="mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                autoComplete="off"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-zinc-700">平台</span>
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value as Platform)}
                className="mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
              >
                <option value="pc">PC</option>
                <option value="console">主机</option>
              </select>
            </label>

            <label>
              <span className="text-sm font-medium text-zinc-700">模式</span>
              <select
                value={gameMode}
                onChange={(event) => setGameMode(event.target.value as GameMode)}
                className="mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
              >
                <option value="competitive">竞技</option>
                <option value="quickplay">快速</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-lg bg-zinc-950 px-5 text-base font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {loading ? "分析中..." : "开始分析"}
            </button>
          </form>

          <p className="mt-4 text-sm leading-6 text-zinc-500">
            仅支持公开资料。AI 分析有每日限额，请优先查询你最想复盘的账号。
          </p>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-5 text-sm text-zinc-600 shadow-sm">
            正在查询战绩并生成分析，稍等一下。
          </div>
        ) : null}

        {result ? <ResultView result={result} /> : null}
      </div>
    </main>
  );
}
