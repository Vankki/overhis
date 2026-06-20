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

  it("rejects names containing additional # separators", () => {
    expect(() => normalizeBattleTag("Foo#Bar#1234")).toThrow(
      "BattleTag 格式不对，请输入类似 TeKrop#2217 的格式。",
    );
  });

  it("rejects whitespace inside player names", () => {
    expect(() => normalizeBattleTag("Te Krop#2217")).toThrow(
      "BattleTag 格式不对，请输入类似 TeKrop#2217 的格式。",
    );
    expect(() => normalizeBattleTag("TeKrop\t#2217")).toThrow(
      "BattleTag 格式不对，请输入类似 TeKrop#2217 的格式。",
    );
  });
});
