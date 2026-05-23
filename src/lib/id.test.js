import { describe, expect, it } from "vitest";
import { newId } from "./id";
describe("newId (ULID)", () => {
    it("26文字固定の文字列を返す", () => {
        const id = newId();
        expect(id).toHaveLength(26);
    });
    it("Crockford Base32文字のみで構成される", () => {
        const id = newId();
        expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    });
    it("連続呼び出しで異なるIDを返す", () => {
        const ids = new Set(Array.from({ length: 100 }, () => newId()));
        expect(ids.size).toBe(100);
    });
    it("時間とともに辞書順で増加する（時系列ソート可能）", async () => {
        const a = newId();
        // ULIDのタイムスタンプ解像度はミリ秒。確実に進める。
        await new Promise((resolve) => setTimeout(resolve, 2));
        const b = newId();
        expect(b > a).toBe(true);
    });
});
