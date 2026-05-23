import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDueDate, isOverdue, todayIso } from "./date";
describe("formatDueDate", () => {
    it("ISO 8601日付を YYYY/MM/DD 形式に変換する", () => {
        expect(formatDueDate("2026-05-12")).toBe("2026/05/12");
    });
    it("空・nullは空文字を返す", () => {
        expect(formatDueDate(null)).toBe("");
        expect(formatDueDate(undefined)).toBe("");
        expect(formatDueDate("")).toBe("");
    });
    it("不正な日付文字列はそのまま返す（パース失敗時のフォールバック）", () => {
        expect(formatDueDate("invalid")).toBe("invalid");
    });
});
describe("isOverdue", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // ローカル時間で2026-05-12を確実に指すようローカル日付コンストラクタを使用
        vi.setSystemTime(new Date(2026, 4, 12, 12, 0, 0));
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it("今日より前の日付はtrue", () => {
        expect(isOverdue("2026-01-01")).toBe(true);
    });
    it("今日と同じ日付はfalse（当日は期限切れ扱いにしない）", () => {
        expect(isOverdue("2026-05-12")).toBe(false);
    });
    it("未来の日付はfalse", () => {
        expect(isOverdue("2099-12-31")).toBe(false);
    });
    it("期日なし(null/undefined/空)はfalse", () => {
        expect(isOverdue(null)).toBe(false);
        expect(isOverdue(undefined)).toBe(false);
        expect(isOverdue("")).toBe(false);
    });
});
describe("todayIso", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 4, 12, 15, 30, 0));
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it("当日をYYYY-MM-DD形式で返す", () => {
        expect(todayIso()).toBe("2026-05-12");
    });
});
