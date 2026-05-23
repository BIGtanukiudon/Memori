import { describe, expect, it } from "vitest";
import { rowToColumn, rowToProject, rowToTask } from "./mappers";
import { Priority } from "@/lib/priority";
describe("rowToProject", () => {
    it("snake_caseのDB行をProjectに変換する", () => {
        expect(rowToProject({
            id: "01PROJECT",
            name: "開発",
            created_at: "2026-05-12T10:00:00.000Z",
            updated_at: "2026-05-12T11:00:00.000Z",
        })).toEqual({
            id: "01PROJECT",
            name: "開発",
            createdAt: "2026-05-12T10:00:00.000Z",
            updatedAt: "2026-05-12T11:00:00.000Z",
        });
    });
});
describe("rowToColumn", () => {
    it("snake_caseのDB行をColumnに変換する", () => {
        expect(rowToColumn({
            id: "01COL",
            project_id: "01PROJECT",
            name: "Todo",
            position: 0,
        })).toEqual({
            id: "01COL",
            projectId: "01PROJECT",
            name: "Todo",
            position: 0,
        });
    });
});
describe("rowToTask", () => {
    it("全フィールドが揃った行をTaskに変換する", () => {
        expect(rowToTask({
            id: "01TASK",
            project_id: "01PROJECT",
            column_id: "01COL",
            title: "実装する",
            memo: "詳細メモ",
            due_date: "2026-05-15",
            priority: 2,
            position: 3,
            created_at: "2026-05-12T10:00:00.000Z",
            updated_at: "2026-05-12T11:00:00.000Z",
        })).toEqual({
            id: "01TASK",
            projectId: "01PROJECT",
            columnId: "01COL",
            title: "実装する",
            memo: "詳細メモ",
            dueDate: "2026-05-15",
            priority: Priority.Medium,
            position: 3,
            createdAt: "2026-05-12T10:00:00.000Z",
            updatedAt: "2026-05-12T11:00:00.000Z",
        });
    });
    it("memo/due_dateのnullを保持する", () => {
        const t = rowToTask({
            id: "01TASK",
            project_id: "01PROJECT",
            column_id: "01COL",
            title: "x",
            memo: null,
            due_date: null,
            priority: 0,
            position: 0,
            created_at: "2026-05-12T10:00:00.000Z",
            updated_at: "2026-05-12T10:00:00.000Z",
        });
        expect(t.memo).toBeNull();
        expect(t.dueDate).toBeNull();
        expect(t.priority).toBe(Priority.None);
    });
    it("不正な優先度はNoneにフォールバック", () => {
        const t = rowToTask({
            id: "01TASK",
            project_id: "01PROJECT",
            column_id: "01COL",
            title: "x",
            memo: null,
            due_date: null,
            priority: 99,
            position: 0,
            created_at: "2026-05-12T10:00:00.000Z",
            updated_at: "2026-05-12T10:00:00.000Z",
        });
        expect(t.priority).toBe(Priority.None);
    });
});
