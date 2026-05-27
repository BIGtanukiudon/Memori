import { beforeEach, describe, expect, it } from "vitest";
import { createMockDb } from "../../tests/helpers/mockDb";
import { useBoardStore } from "@/store/boardStore";
import { createColumnAction, renameColumnAction, deleteColumnCascadeAction, deleteColumnAfterMoveAction, countTasksInColumn, reorderColumnsAction, } from "./columnActions";
beforeEach(() => {
    useBoardStore.getState().reset();
});
describe("createColumnAction", () => {
    it("DBにINSERTし、storeへ追加する", async () => {
        const db = createMockDb();
        // nextColumnPosition の SELECT
        db.select.mockResolvedValueOnce([{ next: 2 }]);
        const c = await createColumnAction(db, "P1", "進行中");
        expect(db.execute).toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO columns/), expect.arrayContaining([c.id, "P1", "進行中", 2]));
        const s = useBoardStore.getState();
        expect(s.columns.map((x) => x.id)).toEqual([c.id]);
        expect(s.columns[0].position).toBe(2);
    });
});
describe("renameColumnAction", () => {
    it("DB UPDATEとstoreを更新する", async () => {
        const db = createMockDb();
        useBoardStore.setState({
            columns: [{ id: "C1", projectId: "P1", name: "旧", position: 0 }],
        });
        await renameColumnAction(db, "C1", "新");
        expect(db.execute).toHaveBeenCalledWith(expect.stringMatching(/UPDATE columns SET name/), expect.arrayContaining(["新", "C1"]));
        expect(useBoardStore.getState().columns[0].name).toBe("新");
    });
});
describe("deleteColumnCascadeAction", () => {
    it("DELETE FROM columnsとstoreから列・配下タスクを除外", async () => {
        const db = createMockDb();
        useBoardStore.setState({
            projects: [{ id: "P1", name: "P", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" }],
            columns: [
                { id: "C1", projectId: "P1", name: "Todo", position: 0 },
                { id: "C2", projectId: "P1", name: "Done", position: 1 },
            ],
            tasks: [
                {
                    id: "T1",
                    projectId: "P1",
                    columnId: "C1",
                    title: "x",
                    memo: null,
                    dueDate: null,
                    priority: 0,
                    position: 0,
                    completedAt: null,
                    createdAt: "",
                    updatedAt: "",
                },
                {
                    id: "T2",
                    projectId: "P1",
                    columnId: "C2",
                    title: "y",
                    memo: null,
                    dueDate: null,
                    priority: 0,
                    position: 0,
                    completedAt: null,
                    createdAt: "",
                    updatedAt: "",
                },
            ],
        });
        await deleteColumnCascadeAction(db, "C1");
        expect(db.execute).toHaveBeenCalledWith(expect.stringMatching(/DELETE FROM columns/), ["C1"]);
        const s = useBoardStore.getState();
        expect(s.columns.map((c) => c.id)).toEqual(["C2"]);
        expect(s.tasks.map((t) => t.id)).toEqual(["T2"]);
    });
    it("完了列を削除するとプロジェクトの doneColumnId がクリアされる", async () => {
        const db = createMockDb();
        useBoardStore.setState({
            projects: [{ id: "P1", name: "P", position: 0, doneColumnId: "C1", createdAt: "", updatedAt: "" }],
            columns: [
                { id: "C1", projectId: "P1", name: "Done", position: 0 },
                { id: "C2", projectId: "P1", name: "Todo", position: 1 },
            ],
            tasks: [],
        });
        await deleteColumnCascadeAction(db, "C1");
        expect(db.execute).toHaveBeenCalledWith(expect.stringMatching(/UPDATE projects SET done_column_id/), [null, "P1"]);
        expect(useBoardStore.getState().projects[0].doneColumnId).toBeNull();
    });
});
describe("deleteColumnAfterMoveAction", () => {
    it("移動先列へタスクを移してから列を削除しstoreを更新", async () => {
        const db = createMockDb();
        db.select.mockResolvedValueOnce([{ next: 0 }]);
        db.select.mockResolvedValueOnce([{ id: "T1" }]);
        useBoardStore.setState({
            projects: [{ id: "P1", name: "P", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" }],
            columns: [
                { id: "C1", projectId: "P1", name: "From", position: 0 },
                { id: "C2", projectId: "P1", name: "Dest", position: 1 },
            ],
            tasks: [
                {
                    id: "T1",
                    projectId: "P1",
                    columnId: "C1",
                    title: "x",
                    memo: null,
                    dueDate: null,
                    priority: 0,
                    position: 0,
                    completedAt: null,
                    createdAt: "",
                    updatedAt: "",
                },
            ],
        });
        await deleteColumnAfterMoveAction(db, "C1", "C2");
        const s = useBoardStore.getState();
        expect(s.columns.map((c) => c.id)).toEqual(["C2"]);
        expect(s.tasks[0].columnId).toBe("C2");
    });
    it("完了列を削除するとプロジェクトの doneColumnId がクリアされる", async () => {
        const db = createMockDb();
        db.select.mockResolvedValueOnce([{ next: 0 }]);
        db.select.mockResolvedValueOnce([{ id: "T1" }]);
        useBoardStore.setState({
            projects: [{ id: "P1", name: "P", position: 0, doneColumnId: "C1", createdAt: "", updatedAt: "" }],
            columns: [
                { id: "C1", projectId: "P1", name: "Done", position: 0 },
                { id: "C2", projectId: "P1", name: "Todo", position: 1 },
            ],
            tasks: [
                {
                    id: "T1",
                    projectId: "P1",
                    columnId: "C1",
                    title: "x",
                    memo: null,
                    dueDate: null,
                    priority: 0,
                    position: 0,
                    completedAt: null,
                    createdAt: "",
                    updatedAt: "",
                },
            ],
        });
        await deleteColumnAfterMoveAction(db, "C1", "C2");
        expect(db.execute).toHaveBeenCalledWith(expect.stringMatching(/UPDATE projects SET done_column_id/), [null, "P1"]);
        expect(useBoardStore.getState().projects[0].doneColumnId).toBeNull();
    });
});
describe("reorderColumnsAction", () => {
    it("DBへ複数UPDATEし、storeのposition順を更新", async () => {
        const db = createMockDb();
        useBoardStore.setState({
            columns: [
                { id: "C1", projectId: "P1", name: "A", position: 0 },
                { id: "C2", projectId: "P1", name: "B", position: 1 },
                { id: "C3", projectId: "P1", name: "C", position: 2 },
            ],
        });
        await reorderColumnsAction(db, "P1", ["C3", "C1", "C2"]);
        expect(db.execute).toHaveBeenCalledTimes(3);
        const sorted = useBoardStore
            .getState()
            .columns.slice()
            .sort((a, b) => a.position - b.position);
        expect(sorted.map((c) => c.id)).toEqual(["C3", "C1", "C2"]);
    });
});
describe("countTasksInColumn", () => {
    it("storeから該当列のタスク件数を返す", () => {
        useBoardStore.setState({
            tasks: [
                {
                    id: "T1",
                    projectId: "P1",
                    columnId: "C1",
                    title: "",
                    memo: null,
                    dueDate: null,
                    priority: 0,
                    position: 0,
                    completedAt: null,
                    createdAt: "",
                    updatedAt: "",
                },
                {
                    id: "T2",
                    projectId: "P1",
                    columnId: "C1",
                    title: "",
                    memo: null,
                    dueDate: null,
                    priority: 0,
                    position: 1,
                    completedAt: null,
                    createdAt: "",
                    updatedAt: "",
                },
                {
                    id: "T3",
                    projectId: "P1",
                    columnId: "C2",
                    title: "",
                    memo: null,
                    dueDate: null,
                    priority: 0,
                    position: 0,
                    completedAt: null,
                    createdAt: "",
                    updatedAt: "",
                },
            ],
        });
        expect(countTasksInColumn("C1")).toBe(2);
        expect(countTasksInColumn("C2")).toBe(1);
        expect(countTasksInColumn("CX")).toBe(0);
    });
});
