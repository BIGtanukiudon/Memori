import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { Priority } from "./priority";
import { applyTaskFilter, applyTaskSort, } from "./taskQuery";
const t = (overrides) => ({
    id: "id",
    projectId: "P1",
    columnId: "C1",
    title: "title",
    memo: null,
    dueDate: null,
    priority: Priority.None,
    position: 0,
    completedAt: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
});
// 「今日」基準を固定
beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T09:00:00.000Z"));
});
afterAll(() => {
    vi.useRealTimers();
});
const tasks = [
    t({ id: "A", projectId: "P1", columnId: "C1", title: "Apple", priority: Priority.High, dueDate: "2026-05-13", createdAt: "2026-05-01T00:00:00.000Z", updatedAt: "2026-05-10T00:00:00.000Z" }),
    t({ id: "B", projectId: "P1", columnId: "C2", title: "Banana", priority: Priority.Medium, dueDate: "2026-04-01", memo: "old item", createdAt: "2026-05-02T00:00:00.000Z", updatedAt: "2026-05-12T00:00:00.000Z" }),
    t({ id: "C", projectId: "P2", columnId: "C3", title: "Cherry", priority: Priority.Low, dueDate: null, createdAt: "2026-05-03T00:00:00.000Z", updatedAt: "2026-05-11T00:00:00.000Z" }),
    t({ id: "D", projectId: "P2", columnId: "C3", title: "Date fruit", priority: Priority.None, dueDate: "2099-01-01", memo: "メモあり", createdAt: "2026-05-04T00:00:00.000Z", updatedAt: "2026-05-09T00:00:00.000Z" }),
];
const empty = {
    projectId: null,
    columnId: null,
    priority: null,
    due: "all",
    search: "",
};
describe("applyTaskFilter - projectId", () => {
    it("nullなら全件", () => {
        expect(applyTaskFilter(tasks, empty).map((x) => x.id)).toEqual(["A", "B", "C", "D"]);
    });
    it("指定プロジェクトのみ", () => {
        expect(applyTaskFilter(tasks, { ...empty, projectId: "P1" }).map((x) => x.id)).toEqual(["A", "B"]);
    });
});
describe("applyTaskFilter - columnId", () => {
    it("指定列のみ", () => {
        expect(applyTaskFilter(tasks, { ...empty, columnId: "C3" }).map((x) => x.id)).toEqual(["C", "D"]);
    });
});
describe("applyTaskFilter - priority", () => {
    it("優先度フィルタ", () => {
        expect(applyTaskFilter(tasks, { ...empty, priority: Priority.High }).map((x) => x.id)).toEqual(["A"]);
    });
});
describe("applyTaskFilter - due", () => {
    it("today: 今日が期日のもののみ", () => {
        const r = applyTaskFilter(tasks, { ...empty, due: "today" });
        expect(r.map((x) => x.id)).toEqual(["A"]);
    });
    it("overdue: 期日が今日より前", () => {
        const r = applyTaskFilter(tasks, { ...empty, due: "overdue" });
        expect(r.map((x) => x.id)).toEqual(["B"]);
    });
    it("none: 期日なし", () => {
        const r = applyTaskFilter(tasks, { ...empty, due: "none" });
        expect(r.map((x) => x.id)).toEqual(["C"]);
    });
    it("all: 全件", () => {
        expect(applyTaskFilter(tasks, { ...empty, due: "all" })).toHaveLength(4);
    });
});
describe("applyTaskFilter - search", () => {
    it("タイトルに部分一致(大文字小文字無視)", () => {
        expect(applyTaskFilter(tasks, { ...empty, search: "apple" }).map((x) => x.id)).toEqual(["A"]);
        expect(applyTaskFilter(tasks, { ...empty, search: "BAN" }).map((x) => x.id)).toEqual(["B"]);
    });
    it("メモにもマッチ", () => {
        expect(applyTaskFilter(tasks, { ...empty, search: "メモ" }).map((x) => x.id)).toEqual(["D"]);
    });
    it("検索文字列を含まない場合は空", () => {
        expect(applyTaskFilter(tasks, { ...empty, search: "存在しない" })).toEqual([]);
    });
    it("前後空白は無視", () => {
        expect(applyTaskFilter(tasks, { ...empty, search: "  apple  " }).map((x) => x.id)).toEqual(["A"]);
    });
});
describe("applyTaskFilter - 複合", () => {
    it("プロジェクト + 期日切れ", () => {
        const r = applyTaskFilter(tasks, { ...empty, projectId: "P1", due: "overdue" });
        expect(r.map((x) => x.id)).toEqual(["B"]);
    });
});
describe("applyTaskSort", () => {
    const dueSort = { key: "due", asc: true };
    const prioritySort = { key: "priority", asc: false };
    const updatedSort = { key: "updated", asc: false };
    const createdSort = { key: "created", asc: true };
    it("期日昇順: nullは末尾", () => {
        const r = applyTaskSort(tasks, dueSort);
        expect(r.map((x) => x.id)).toEqual(["B", "A", "D", "C"]);
    });
    it("期日降順: nullは末尾", () => {
        const r = applyTaskSort(tasks, { ...dueSort, asc: false });
        expect(r.map((x) => x.id)).toEqual(["D", "A", "B", "C"]);
    });
    it("優先度降順 (High → Low)", () => {
        const r = applyTaskSort(tasks, prioritySort);
        expect(r.map((x) => x.id)).toEqual(["A", "B", "C", "D"]);
    });
    it("更新日時降順", () => {
        const r = applyTaskSort(tasks, updatedSort);
        expect(r.map((x) => x.id)).toEqual(["B", "C", "A", "D"]);
    });
    it("作成日時昇順", () => {
        const r = applyTaskSort(tasks, createdSort);
        expect(r.map((x) => x.id)).toEqual(["A", "B", "C", "D"]);
    });
    it("元の配列を破壊しない", () => {
        const before = tasks.map((x) => x.id);
        applyTaskSort(tasks, dueSort);
        expect(tasks.map((x) => x.id)).toEqual(before);
    });
});
describe("DueFilter type", () => {
    it("4つの値が許可される", () => {
        const values = ["all", "today", "overdue", "none"];
        expect(values).toHaveLength(4);
    });
});
