"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AiAnalysis,
  AnalyzeSuccessResponse,
  HeroSnapshot,
  PlayerRank,
} from "@/lib/types";

type ResultViewProps = {
  result: AnalyzeSuccessResponse;
};

type CopyState = "idle" | "success" | "error";

const roleLabels: Record<PlayerRank["role"], string> = {
  tank: "重装",
  damage: "输出",
  support: "支援",
  open: "开放",
};

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("zh-CN").format(Math.round(value));
}

function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return value.toFixed(2);
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0 分钟";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours <= 0) {
    return `${minutes} 分钟`;
  }

  if (minutes <= 0) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${minutes} 分钟`;
}

function formatRankLabel(rank: PlayerRank): string {
  const division = rank.division.trim();
  const tier = Number.isFinite(rank.tier) ? ` ${rank.tier}` : "";

  return `${roleLabels[rank.role]} ${division}${tier}`;
}

function buildSummary(result: AnalyzeSuccessResponse): string {
  const { snapshot, analysis } = result;
  const playerName = snapshot.player.name || snapshot.query.battleTag;
  const topHero = snapshot.topHeroes[0];
  const heroText = topHero
    ? `主玩 ${topHero.hero}，胜率 ${formatPercent(topHero.winrate)}。`
    : "暂无主要英雄数据。";
  const aiText = analysis?.summary ? `AI 画像：${analysis.summary}` : "";

  return [
    `${playerName} 的 ${snapshot.query.gameMode === "competitive" ? "竞技" : "快速"} 数据：${formatNumber(snapshot.general.gamesPlayed)} 场，胜率 ${formatPercent(snapshot.general.winrate)}，KDA ${formatDecimal(snapshot.general.kda)}。`,
    heroText,
    aiText,
  ]
    .filter(Boolean)
    .join("\n");
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-semibold text-zinc-950">
        {value}
      </p>
      {hint ? <p className="mt-1 text-sm text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-zinc-950">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-700">
        {items.map((item) => (
          <li key={item} className="break-words">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnalysisSections({ analysis }: { analysis: AiAnalysis }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:col-span-2">
        <h3 className="text-base font-semibold text-zinc-950">一句话画像</h3>
        <p className="mt-3 break-words text-sm leading-6 text-zinc-700">
          {analysis.summary}
        </p>
      </section>
      <SectionList title="优势" items={analysis.strengths} />
      <SectionList title="短板" items={analysis.weaknesses} />
      <SectionList title="下次排位建议" items={analysis.nextSteps} />
      <SectionList title="适合练的英雄/打法方向" items={analysis.heroFocus} />
      <section className="rounded-lg border border-zinc-900 bg-zinc-950 p-4 text-white shadow-sm md:col-span-2">
        <h3 className="text-base font-semibold">锐评</h3>
        <p className="mt-3 break-words text-sm leading-6 text-zinc-200">
          {analysis.roast}
        </p>
      </section>
    </div>
  );
}

function HeroRow({ hero }: { hero: HeroSnapshot }) {
  return (
    <li className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-zinc-950">
          {hero.hero}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          {formatTime(hero.timePlayedSeconds)} / {formatNumber(hero.gamesPlayed)} 场
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm sm:min-w-80">
        <div>
          <p className="text-zinc-500">胜率</p>
          <p className="font-semibold text-zinc-950">
            {formatPercent(hero.winrate)}
          </p>
        </div>
        <div>
          <p className="text-zinc-500">KDA</p>
          <p className="font-semibold text-zinc-950">{formatDecimal(hero.kda)}</p>
        </div>
        <div>
          <p className="text-zinc-500">场均伤害</p>
          <p className="font-semibold text-zinc-950">
            {formatNumber(hero.averageDamage)}
          </p>
        </div>
      </div>
    </li>
  );
}

export function ResultView({ result }: ResultViewProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const copyResetTimeoutRef = useRef<number | null>(null);
  const { snapshot, analysis, aiError, quota } = result;
  const player = snapshot.player;
  const general = snapshot.general;
  const modeLabel = snapshot.query.gameMode === "competitive" ? "竞技" : "快速";
  const serverLabel = "国服";

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopySummary() {
    if (copyResetTimeoutRef.current !== null) {
      window.clearTimeout(copyResetTimeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(buildSummary(result));
      setCopyState("success");
    } catch {
      setCopyState("error");
    }

    copyResetTimeoutRef.current = window.setTimeout(() => {
      setCopyState("idle");
      copyResetTimeoutRef.current = null;
    }, 1800);
  }

  return (
    <section className="mt-8 w-full space-y-5">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {player.avatar ? (
              <img
                src={player.avatar}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg border border-zinc-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xl font-semibold text-white">
                {(player.name || snapshot.query.battleTag).slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold text-zinc-950">
                {player.name || snapshot.query.battleTag}
              </h2>
              <p className="mt-1 break-words text-sm text-zinc-500">
                {player.title || "公开生涯资料"} · {serverLabel} · {modeLabel}
              </p>
              {player.ranks.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {player.ranks.map((rank) => (
                    <span
                      key={`${rank.role}-${rank.division}-${rank.tier}`}
                      className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700"
                    >
                      {formatRankLabel(rank)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopySummary}
            aria-live="polite"
            className="h-11 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {copyState === "success"
              ? "已复制"
              : copyState === "error"
                ? "复制失败"
                : "复制摘要"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="总场次"
          value={formatNumber(general.gamesPlayed)}
          hint={`${formatNumber(general.gamesWon)} 胜 / ${formatNumber(general.gamesLost)} 负`}
        />
        <StatTile label="胜率" value={formatPercent(general.winrate)} />
        <StatTile label="KDA" value={formatDecimal(general.kda)} />
        <StatTile label="总时长" value={formatTime(general.timePlayedSeconds)} />
        <StatTile
          label="场均消灭"
          value={formatDecimal(general.averageEliminations)}
        />
        <StatTile label="场均死亡" value={formatDecimal(general.averageDeaths)} />
        <StatTile label="总伤害" value={formatNumber(general.totalDamage)} />
        <StatTile label="总治疗" value={formatNumber(general.totalHealing)} />
      </div>

      {snapshot.topHeroes.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold text-zinc-950">常用英雄</h3>
          <ul className="mt-3 space-y-3">
            {snapshot.topHeroes.slice(0, 5).map((hero) => (
              <HeroRow key={hero.hero} hero={hero} />
            ))}
          </ul>
        </section>
      ) : null}

      {analysis ? (
        <AnalysisSections analysis={analysis} />
      ) : (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <h3 className="text-base font-semibold">AI 分析暂时不可用</h3>
          <p className="mt-2 break-words text-sm leading-6">
            {aiError || "AI 分析服务开小差了，但上面的玩家数据仍然可用。"}
          </p>
        </section>
      )}

      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        今日 AI 分析额度：已用 {formatNumber(quota.used)} / {formatNumber(quota.limit)}
        ，剩余 {formatNumber(quota.remaining)} 次。
      </p>
    </section>
  );
}
