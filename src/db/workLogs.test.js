import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkLog, deleteWorkLog, listWorkLogsByTask, updateWorkLog } from "./workLogs";
import { createMockDb } from "../../tests/helpers/mockDb";
describe("createWorkLog", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 7, 30, 9, 15, 0));
    });
    afterEach(() => vi.useRealTimers());
    it("タスク・プロジェクトからスナップショットを解決して作成する", async () => {
        const db = createMockDb();
        db.select.mockResolvedValueOnce([
            { project_id: "P1", task_title: "実装する", project_name: "開発" },
        ]);
        const log = await createWorkLog(db, { taskId: "T1", body: "仕様を確認した" });
        expect(log.id).toHaveLength(26);
        expect(log.taskId).toBe("T1");
        expect(log.projectId).toBe("P1");
        expect(log.body).toBe("仕様を確認した");
        expect(log.taskTitle).toBe("実装する");
        expect(log.projectName).toBe("開発");
        expect(log.createdAt).toBe(log.updatedAt);
        const [sql, params] = db.execute.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO work_logs/i);
        expect(params).toEqual([
            log.id,
            "T1",
            "P1",
            "仕様を確認した",
            "実装する",
            "開発",
            log.createdAt,
            log.updatedAt,
        ]);
    });
    it("存在しないtaskIdで作成するとエラー", async () => {
        const db = createMockDb();
        db.select.mockResolvedValueOnce([]);
        await expect(createWorkLog(db, { taskId: "missing", body: "x" })).rejects.toThrow();
    });
    it("空白のみのbodyはエラー", async () => {
        const db = createMockDb();
        db.select.mockResolvedValueOnce([
            { project_id: "P1", task_title: "実装する", project_name: "開発" },
        ]);
        await expect(createWorkLog(db, { taskId: "T1", body: "   " })).rejects.toThrow();
    });
});
describe("listWorkLogsByTask", () => {
    it("新しい順(created_at DESC)で取得する", async () => {
        const db = createMockDb();
        db.select.mockResolvedValue([
            {
                id: "L2",
                task_id: "T1",
                project_id: "P1",
                body: "b2",
                task_title: "実装する",
                project_name: "開発",
                created_at: "2026-08-30T02:00:00.000Z",
                updated_at: "2026-08-30T02:00:00.000Z",
            },
        ]);
        const res = await listWorkLogsByTask(db, "T1");
        expect(res).toHaveLength(1);
        expect(res[0].id).toBe("L2");
        const [sql, params] = db.select.mock.calls[0];
        expect(sql).toMatch(/WHERE task_id = .*ORDER BY created_at DESC/is);
        expect(params).toEqual(["T1"]);
    });
});
describe("updateWorkLog", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 7, 30, 11, 40, 0));
    });
    afterEach(() => vi.useRealTimers());
    it("bodyとupdated_atのみ更新する", async () => {
        const db = createMockDb();
        await updateWorkLog(db, "L1", "更新後の本文");
        const [sql, params] = db.execute.mock.calls[0];
        expect(sql).toMatch(/UPDATE work_logs SET body = .*updated_at = .*WHERE id = /is);
        expect(sql).not.toMatch(/created_at/i);
        expect(params).toEqual(["更新後の本文", new Date(2026, 7, 30, 11, 40, 0).toISOString(), "L1"]);
    });
    it("空白のみのbodyはエラー", async () => {
        const db = createMockDb();
        await expect(updateWorkLog(db, "L1", "  ")).rejects.toThrow();
    });
});
describe("deleteWorkLog", () => {
    it("DELETEを発行する", async () => {
        const db = createMockDb();
        await deleteWorkLog(db, "L1");
        const [sql, params] = db.execute.mock.calls[0];
        expect(sql).toMatch(/DELETE FROM work_logs WHERE id = /i);
        expect(params).toEqual(["L1"]);
    });
});
