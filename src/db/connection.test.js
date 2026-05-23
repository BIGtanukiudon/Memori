import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const loadMock = vi.fn();
vi.mock("@tauri-apps/plugin-sql", () => ({
    default: { load: loadMock },
}));
describe("getDb", () => {
    beforeEach(() => {
        loadMock.mockReset();
        loadMock.mockResolvedValue({ __mockDb: true });
        vi.resetModules();
        // テスト環境にTauriランタイムが存在する状態を擬装
        window.__TAURI_INTERNALS__ = {};
    });
    afterEach(() => {
        delete window.__TAURI_INTERNALS__;
    });
    it("sqlite:kanban.db でDBをロードする", async () => {
        const { getDb } = await import("./connection");
        await getDb();
        expect(loadMock).toHaveBeenCalledWith("sqlite:kanban.db");
    });
    it("複数回呼び出しても同じインスタンスを返す（キャッシュ）", async () => {
        const { getDb } = await import("./connection");
        const a = await getDb();
        const b = await getDb();
        expect(a).toBe(b);
        expect(loadMock).toHaveBeenCalledTimes(1);
    });
    it("Tauri環境でない場合はわかりやすいエラーをrejectする", async () => {
        delete window.__TAURI_INTERNALS__;
        const { getDb } = await import("./connection");
        await expect(getDb()).rejects.toThrow(/Tauri環境ではない/);
        expect(loadMock).not.toHaveBeenCalled();
    });
});
