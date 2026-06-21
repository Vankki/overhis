import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Analyzer } from "@/components/Analyzer";
import type { AnalyzeSuccessResponse } from "@/lib/types";

const successResponse: AnalyzeSuccessResponse = {
  ok: true,
  snapshot: {
    player: {
      id: "517215771",
      name: "西野七濑#51404",
      avatar: null,
      title: null,
      endorsementLevel: null,
      ranks: [],
      lastUpdatedAt: null,
    },
    query: {
      battleTag: "西野七濑#51404",
      platform: "pc",
      gameMode: "competitive",
    },
    general: {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      timePlayedSeconds: 0,
      winrate: 0,
      kda: 0,
      totalEliminations: 0,
      totalAssists: 0,
      totalDeaths: 0,
      totalDamage: 0,
      totalHealing: 0,
      averageEliminations: 0,
      averageAssists: 0,
      averageDeaths: 0,
      averageDamage: 0,
      averageHealing: 0,
    },
    roles: {},
    topHeroes: [],
  },
  analysis: null,
  aiError: null,
  quota: {
    limit: 5,
    used: 1,
    remaining: 4,
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Analyzer", () => {
  it("submits a fixed national-server BattleTag from split inputs", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(successResponse));
    const user = userEvent.setup();

    render(<Analyzer />);

    await user.type(screen.getByLabelText("玩家昵称"), "西野七濑");
    await user.type(screen.getByLabelText("编号"), "51404");
    await user.click(screen.getByRole("button", { name: "开始分析" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(body).toEqual({
      battleTag: "西野七濑#51404",
      gameMode: "competitive",
    });
    expect(body).not.toHaveProperty("platform");
  });
});
