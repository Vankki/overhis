import { describe, expect, it } from "vitest";
import { normalizeBattleTag } from "./battletag";

describe("normalizeBattleTag", () => {
  it("converts a BattleTag with # into an OverFast player id", () => {
    expect(normalizeBattleTag(" TeKrop#2217 ")).toEqual({
      display: "TeKrop#2217",
      playerId: "TeKrop#2217",
    });
  });

  it("accepts non-ASCII player names", () => {
    expect(normalizeBattleTag("源氏玩家#12345")).toEqual({
      display: "源氏玩家#12345",
      playerId: "源氏玩家#12345",
    });
  });

  it("normalizes a full-width separator copied from Chinese input", () => {
    expect(normalizeBattleTag("西野七濑＃51404")).toEqual({
      display: "西野七濑#51404",
      playerId: "西野七濑#51404",
    });
  });

  it("rejects hyphen-only ids because users should enter BattleTag format", () => {
    expect(() => normalizeBattleTag("TeKrop-2217")).toThrow(
      "国服 BattleTag 格式不对，请输入玩家昵称和数字编号。",
    );
  });

  it("rejects empty names and non-numeric discriminators", () => {
    expect(() => normalizeBattleTag("#2217")).toThrow(
      "国服 BattleTag 格式不对，请输入玩家昵称和数字编号。",
    );
    expect(() => normalizeBattleTag("TeKrop#abc")).toThrow(
      "国服 BattleTag 格式不对，请输入玩家昵称和数字编号。",
    );
    expect(() => normalizeBattleTag("西野七濑#")).toThrow(
      "国服 BattleTag 格式不对，请输入玩家昵称和数字编号。",
    );
  });

  it("rejects names containing additional # separators", () => {
    expect(() => normalizeBattleTag("Foo#Bar#1234")).toThrow(
      "国服 BattleTag 格式不对，请输入玩家昵称和数字编号。",
    );
  });

  it("rejects whitespace inside player names", () => {
    expect(() => normalizeBattleTag("Te Krop#2217")).toThrow(
      "国服 BattleTag 格式不对，请输入玩家昵称和数字编号。",
    );
    expect(() => normalizeBattleTag("TeKrop\t#2217")).toThrow(
      "国服 BattleTag 格式不对，请输入玩家昵称和数字编号。",
    );
  });
});
