import { beforeEach, describe, expect, it } from "vitest";
import { Priority } from "@/lib/priority";
import { useBoardStore } from "./boardStore";
const makeProject = (id, name = id, position = 0) => ({
    id,
    name,
    position,
    doneColumnId: null,
    createdAt: "2026-05-12T10:00:00.000Z",
    updatedAt: "2026-05-12T10:00:00.000Z",
});
const makeColumn = (id, projectId, position, name = id) => ({
    id,
    projectId,
    name,
    position,
});
const makeTask = (id, columnId, position, projectId = "P") => ({
    id,
    projectId,
    columnId,
    title: id,
    memo: null,
    dueDate: null,
    priority: Priority.None,
    position,
    completedAt: null,
    createdAt: "2026-05-12T10:00:00.000Z",
    updatedAt: "2026-05-12T10:00:00.000Z",
});
describe("boardStore", () => {
    beforeEach(() => {
        useBoardStore.getState().reset();
    });
    describe("setters", () => {
        it("setProjects/setCurrentProject/setColumns/setTasks", () => {
            const s = useBoardStore.getState();
            s.setProjects([makeProject("P1"), makeProject("P2")]);
            s.setCurrentProject("P1");
            s.setColumns([makeColumn("C0", "P1", 0)]);
            s.setTasks([makeTask("T0", "C0", 0, "P1")]);
            const state = useBoardStore.getState();
            expect(state.projects).toHaveLength(2);
            expect(state.currentProjectId).toBe("P1");
            expect(state.columns).toHaveLength(1);
            expect(state.tasks).toHaveLength(1);
        });
    });
    describe("プロジェクト操作", () => {
        it("upsertProject: 新規追加", () => {
            const s = useBoardStore.getState();
            s.upsertProject(makeProject("P1"));
            expect(useBoardStore.getState().projects).toHaveLength(1);
        });
        it("upsertProject: 同一IDなら置換", () => {
            const s = useBoardStore.getState();
            s.upsertProject(makeProject("P1", "旧"));
            s.upsertProject(makeProject("P1", "新"));
            const ps = useBoardStore.getState().projects;
            expect(ps).toHaveLength(1);
            expect(ps[0].name).toBe("新");
        });
        it("removeProject: 対象を除去し、currentが消えたらcurrentもnull", () => {
            const s = useBoardStore.getState();
            s.setProjects([makeProject("P1")]);
            s.setCurrentProject("P1");
            s.removeProject("P1");
            const state = useBoardStore.getState();
            expect(state.projects).toHaveLength(0);
            expect(state.currentProjectId).toBeNull();
        });
        it("reorderProjects: 与えた順でposition再採番", () => {
            const s = useBoardStore.getState();
            s.setProjects([
                makeProject("P0", "A", 0),
                makeProject("P1", "B", 1),
                makeProject("P2", "C", 2),
            ]);
            s.reorderProjects(["P2", "P0", "P1"]);
            const ps = [...useBoardStore.getState().projects].sort((a, b) => a.position - b.position);
            expect(ps.map((p) => p.id)).toEqual(["P2", "P0", "P1"]);
            expect(ps.map((p) => p.position)).toEqual([0, 1, 2]);
        });
    });
    describe("列操作", () => {
        it("upsertColumn: 新規追加とID重複時の置換", () => {
            const s = useBoardStore.getState();
            s.upsertColumn(makeColumn("C0", "P", 0, "Todo"));
            s.upsertColumn(makeColumn("C0", "P", 0, "ToDo"));
            const cs = useBoardStore.getState().columns;
            expect(cs).toHaveLength(1);
            expect(cs[0].name).toBe("ToDo");
        });
        it("removeColumn: 列削除と配下タスクも除外", () => {
            const s = useBoardStore.getState();
            s.setColumns([makeColumn("C0", "P", 0), makeColumn("C1", "P", 1)]);
            s.setTasks([makeTask("T0", "C0", 0), makeTask("T1", "C1", 0)]);
            s.removeColumn("C0");
            const state = useBoardStore.getState();
            expect(state.columns.map((c) => c.id)).toEqual(["C1"]);
            expect(state.tasks.map((t) => t.id)).toEqual(["T1"]);
        });
        it("reorderColumns: 与えた順でposition再採番", () => {
            const s = useBoardStore.getState();
            s.setColumns([
                makeColumn("C0", "P", 0),
                makeColumn("C1", "P", 1),
                makeColumn("C2", "P", 2),
            ]);
            s.reorderColumns(["C2", "C0", "C1"]);
            const cs = [...useBoardStore.getState().columns].sort((a, b) => a.position - b.position);
            expect(cs.map((c) => c.id)).toEqual(["C2", "C0", "C1"]);
            expect(cs.map((c) => c.position)).toEqual([0, 1, 2]);
        });
    });
    describe("タスク操作", () => {
        it("upsertTask: 追加 / 同一IDなら置換", () => {
            const s = useBoardStore.getState();
            s.upsertTask(makeTask("T0", "C0", 0));
            s.upsertTask({ ...makeTask("T0", "C0", 0), title: "updated" });
            const ts = useBoardStore.getState().tasks;
            expect(ts).toHaveLength(1);
            expect(ts[0].title).toBe("updated");
        });
        it("removeTask: 該当タスクを除外", () => {
            const s = useBoardStore.getState();
            s.setTasks([makeTask("T0", "C0", 0), makeTask("T1", "C0", 1)]);
            s.removeTask("T0");
            expect(useBoardStore.getState().tasks.map((t) => t.id)).toEqual(["T1"]);
        });
        it("reorderTasksInColumn: 同列内でposition再採番", () => {
            const s = useBoardStore.getState();
            s.setTasks([
                makeTask("A", "C0", 0),
                makeTask("B", "C0", 1),
                makeTask("C", "C0", 2),
            ]);
            s.reorderTasksInColumn("C0", ["C", "A", "B"]);
            const ts = [...useBoardStore.getState().tasks]
                .filter((t) => t.columnId === "C0")
                .sort((a, b) => a.position - b.position);
            expect(ts.map((t) => t.id)).toEqual(["C", "A", "B"]);
            expect(ts.map((t) => t.position)).toEqual([0, 1, 2]);
        });
        it("moveTaskAcrossColumns: 移動先列を変更し両方の列を再採番", () => {
            const s = useBoardStore.getState();
            s.setTasks([
                makeTask("A", "C0", 0),
                makeTask("B", "C0", 1),
                makeTask("X", "C1", 0),
            ]);
            // BをC1の先頭に移動
            s.moveTaskAcrossColumns("B", "C1", ["A"], ["B", "X"]);
            const tasks = useBoardStore.getState().tasks;
            const c0 = tasks.filter((t) => t.columnId === "C0").sort((a, b) => a.position - b.position);
            const c1 = tasks.filter((t) => t.columnId === "C1").sort((a, b) => a.position - b.position);
            expect(c0.map((t) => t.id)).toEqual(["A"]);
            expect(c0.map((t) => t.position)).toEqual([0]);
            expect(c1.map((t) => t.id)).toEqual(["B", "X"]);
            expect(c1.map((t) => t.position)).toEqual([0, 1]);
            // 移動したタスクのcolumnIdが更新されている
            expect(tasks.find((t) => t.id === "B").columnId).toBe("C1");
        });
    });
});
