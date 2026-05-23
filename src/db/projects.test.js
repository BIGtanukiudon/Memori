import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProject, deleteProject, listProjects, renameProject } from "./projects";
import { createMockDb } from "../../tests/helpers/mockDb";
describe("createProject", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 4, 12, 12, 0, 0));
    });
    afterEach(() => vi.useRealTimers());
    it("ULIDと現在時刻を採番してINSERTし、作成したProjectを返す", async () => {
        const db = createMockDb();
        const p = await createProject(db, "開発");
        expect(p.id).toHaveLength(26);
        expect(p.name).toBe("開発");
        expect(p.createdAt).toBe(p.updatedAt);
        expect(db.execute).toHaveBeenCalledTimes(1);
        const [sql, params] = db.execute.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO projects/i);
        expect(params).toEqual([p.id, "開発", p.createdAt, p.updatedAt]);
    });
    it("名前の前後空白はトリムする", async () => {
        const db = createMockDb();
        const p = await createProject(db, "  test  ");
        expect(p.name).toBe("test");
    });
    it("空文字や空白のみはエラー", async () => {
        const db = createMockDb();
        await expect(createProject(db, "")).rejects.toThrow();
        await expect(createProject(db, "   ")).rejects.toThrow();
        expect(db.execute).not.toHaveBeenCalled();
    });
});
describe("listProjects", () => {
    it("created_at昇順で全プロジェクトを返す", async () => {
        const db = createMockDb();
        db.select.mockResolvedValue([
            {
                id: "01A",
                name: "プロジェクトA",
                created_at: "2026-05-10T10:00:00.000Z",
                updated_at: "2026-05-10T10:00:00.000Z",
            },
            {
                id: "01B",
                name: "プロジェクトB",
                created_at: "2026-05-11T10:00:00.000Z",
                updated_at: "2026-05-11T10:00:00.000Z",
            },
        ]);
        const result = await listProjects(db);
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe("プロジェクトA");
        expect(db.select.mock.calls[0][0]).toMatch(/ORDER BY created_at/i);
    });
});
describe("renameProject", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 4, 12, 13, 0, 0));
    });
    afterEach(() => vi.useRealTimers());
    it("nameとupdated_atを更新する", async () => {
        const db = createMockDb();
        await renameProject(db, "01PROJECT", "新名称");
        const [sql, params] = db.execute.mock.calls[0];
        expect(sql).toMatch(/UPDATE projects/i);
        expect(sql).toMatch(/SET name = .*updated_at = /is);
        expect(params).toHaveLength(3);
        expect(params[0]).toBe("新名称");
        expect(params[2]).toBe("01PROJECT");
    });
    it("空文字はエラー", async () => {
        const db = createMockDb();
        await expect(renameProject(db, "01PROJECT", "")).rejects.toThrow();
    });
});
describe("deleteProject", () => {
    it("DELETEを発行する（CASCADEで配下も削除される想定）", async () => {
        const db = createMockDb();
        await deleteProject(db, "01PROJECT");
        const [sql, params] = db.execute.mock.calls[0];
        expect(sql).toMatch(/DELETE FROM projects WHERE id = /i);
        expect(params).toEqual(["01PROJECT"]);
    });
});
