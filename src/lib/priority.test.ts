import { describe, expect, it } from "vitest";
import { Priority, priorityLabel, parsePriority } from "./priority";

describe("priorityLabel", () => {
  it.each([
    [Priority.None, "なし"],
    [Priority.Low, "低"],
    [Priority.Medium, "中"],
    [Priority.High, "高"],
  ])("priorityLabel(%i) -> '%s'", (p, label) => {
    expect(priorityLabel(p)).toBe(label);
  });
});

describe("parsePriority", () => {
  it("数値0〜3はそのまま優先度になる", () => {
    expect(parsePriority(0)).toBe(Priority.None);
    expect(parsePriority(3)).toBe(Priority.High);
  });

  it("範囲外はNoneにフォールバック", () => {
    expect(parsePriority(-1)).toBe(Priority.None);
    expect(parsePriority(99)).toBe(Priority.None);
    expect(parsePriority(1.5)).toBe(Priority.None);
  });
});
