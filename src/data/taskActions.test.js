import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb } from "../../tests/helpers/mockDb";
import { useBoardStore } from "@/store/boardStore";
import { Priority } from "@/lib/priority";
import { createTaskAction, updateTaskAction, deleteTaskAction, moveTaskAction, } from "./taskActions";
beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 27, 12, 0, 0));
    useBoardStore.getState().reset();
});
afterEach(() => vi.useRealTimers());
describe("createTaskAction", () => {
    it("DB INSERTとstoreへの追加を行う", async () => {
        const db = createMockDb();
        db.select.mockResolvedValueOnce([{ next: 0 }]);
        useBoardStore.setState({
            projects: [{ id: "P1", name: "", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" }],
            columns: [{ id: "C1", projectId: "P1", name: "Todo", position: 0 }],
            tasks: [],
        });
        const t = await createTaskAction(db, {
            projectId: "P1",
            columnId: "C1",
            title: "新規",
        });
        expect(t.title).toBe("新規");
        expect(useBoardStore.getState().tasks.map((x) => x.id)).toEqual([t.id]);
    });
});
describe("updateTaskAction", () => {
    it("DB UPDATE と store の該当タスクを更新", async () => {
        const db = createMockDb();
        useBoardStore.setState({
            tasks: [
                {
                    id: "T1",
                    projectId: "P1",
                    columnId: "C1",
                    title: "旧",
                    memo: null,
                    dueDate: null,
                    priority: Priority.None,
                    position: 0,
                    completedAt: null,
                    createdAt: "t0",
                    updatedAt: "t0",
                },
            ],
        });
        await updateTaskAction(db, "T1", {
            title: "新",
            memo: "メモ",
            dueDate: "2026-06-01",
            priority: Priority.High,
        });
        expect(db.execute).toHaveBeenCalledWith(expect.stringMatching(/UPDATE tasks SET/), expect.any(Array));
        const t = useBoardStore.getState().tasks[0];
        expect(t.title).toBe("新");
        expect(t.memo).toBe("メモ");
        expect(t.dueDate).toBe("2026-06-01");
        expect(t.priority).toBe(Priority.High);
        expect(t.updatedAt).not.toBe("t0");
    });
});
describe("deleteTaskAction", () => {
    it("DB DELETE と storeから除外", async () => {
        const db = createMockDb();
        useBoardStore.setState({
            tasks: [
                {
                    id: "T1",
                    projectId: "P1",
                    columnId: "C1",
                    title: "x",
                    memo: null,
                    dueDate: null,
                    priority: Priority.None,
                    position: 0,
                    completedAt: null,
                    createdAt: "",
                    updatedAt: "",
                },
            ],
        });
        await deleteTaskAction(db, "T1");
        expect(db.execute).toHaveBeenCalledWith(expect.stringMatching(/DELETE FROM tasks/), ["T1"]);
        expect(useBoardStore.getState().tasks).toEqual([]);
    });
});
describe("moveTaskAction", () => {
    const baseTask = (id, columnId, position) => ({
        id,
        projectId: "P1",
        columnId,
        title: id,
        memo: null,
        dueDate: null,
        priority: Priority.None,
        position,
        completedAt: null,
        createdAt: "",
        updatedAt: "",
    });
    const baseTasks = [
        baseTask("T1", "C1", 0),
        baseTask("T2", "C1", 1),
        baseTask("T3", "C2", 0),
    ];
    it("同列内の並び替え", async () => {
        const db = createMockDb();
        useBoardStore.setState({ tasks: [...baseTasks] });
        await moveTaskAction(db, {
            taskId: "T2",
            toColumnId: "C1",
            toIndex: 0,
        });
        const c1 = useBoardStore
            .getState()
            .tasks.filter((t) => t.columnId === "C1")
            .sort((a, b) => a.position - b.position);
        expect(c1.map((t) => t.id)).toEqual(["T2", "T1"]);
        expect(c1.map((t) => t.position)).toEqual([0, 1]);
        expect(db.execute).toHaveBeenCalledWith(expect.stringMatching(/UPDATE tasks SET position/), expect.any(Array));
    });
    it("列間の移動", async () => {
        const db = createMockDb();
        useBoardStore.setState({ tasks: [...baseTasks] });
        await moveTaskAction(db, {
            taskId: "T1",
            toColumnId: "C2",
            toIndex: 1,
        });
        const c1 = useBoardStore
            .getState()
            .tasks.filter((t) => t.columnId === "C1")
            .sort((a, b) => a.position - b.position);
        const c2 = useBoardStore
            .getState()
            .tasks.filter((t) => t.columnId === "C2")
            .sort((a, b) => a.position - b.position);
        expect(c1.map((t) => t.id)).toEqual(["T2"]);
        expect(c2.map((t) => t.id)).toEqual(["T3", "T1"]);
        expect(db.execute).toHaveBeenCalledWith(expect.stringMatching(/UPDATE tasks SET column_id/), expect.arrayContaining(["C2", "T1"]));
    });
    it("完了列への移動で completedAt が記録される", async () => {
        const db = createMockDb();
        useBoardStore.setState({
            projects: [{ id: "P1", name: "P", position: 0, doneColumnId: "C2", createdAt: "", updatedAt: "" }],
            tasks: [...baseTasks],
        });
        await moveTaskAction(db, {
            taskId: "T1",
            toColumnId: "C2",
            toIndex: 0,
        });
        const moved = useBoardStore.getState().tasks.find((t) => t.id === "T1");
        expect(moved.completedAt).toBe(new Date().toISOString());
    });
    it("完了列から出ると completedAt がクリアされる", async () => {
        const db = createMockDb();
        const tasks = [
            { ...baseTask("T1", "C2", 0), completedAt: "2026-05-20T00:00:00.000Z" },
            baseTask("T2", "C1", 0),
        ];
        useBoardStore.setState({
            projects: [{ id: "P1", name: "P", position: 0, doneColumnId: "C2", createdAt: "", updatedAt: "" }],
            tasks,
        });
        await moveTaskAction(db, {
            taskId: "T1",
            toColumnId: "C1",
            toIndex: 1,
        });
        const moved = useBoardStore.getState().tasks.find((t) => t.id === "T1");
        expect(moved.completedAt).toBeNull();
    });
    it("完了列が未設定の場合は completedAt を変更しない", async () => {
        const db = createMockDb();
        useBoardStore.setState({
            projects: [{ id: "P1", name: "P", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" }],
            tasks: [...baseTasks],
        });
        await moveTaskAction(db, {
            taskId: "T1",
            toColumnId: "C2",
            toIndex: 0,
        });
        const moved = useBoardStore.getState().tasks.find((t) => t.id === "T1");
        expect(moved.completedAt).toBeNull();
    });
});
