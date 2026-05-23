import { describe, expect, it } from "vitest";
import { Priority } from "./priority";
import { COLUMN_DROPPABLE_PREFIX, computeTaskMove } from "./dnd";
const t = (id, columnId, position) => ({
    id,
    projectId: "P",
    columnId,
    title: id,
    memo: null,
    dueDate: null,
    priority: Priority.None,
    position,
    createdAt: "",
    updatedAt: "",
});
const tasks = [
    t("A", "C1", 0),
    t("B", "C1", 1),
    t("C", "C1", 2),
    t("D", "C2", 0),
    t("E", "C2", 1),
];
describe("computeTaskMove", () => {
    it("overId が null なら null", () => {
        expect(computeTaskMove({ activeId: "A", overId: null, tasks })).toBeNull();
    });
    it("activeId と overId が同じなら null", () => {
        expect(computeTaskMove({ activeId: "A", overId: "A", tasks })).toBeNull();
    });
    it("同列内: A を C の位置にドロップすると C のindex(2)に挿入", () => {
        const m = computeTaskMove({ activeId: "A", overId: "C", tasks });
        expect(m).toEqual({ taskId: "A", toColumnId: "C1", toIndex: 2 });
    });
    it("同列内: C を A の位置にドロップすると A のindex(0)に挿入", () => {
        const m = computeTaskMove({ activeId: "C", overId: "A", tasks });
        expect(m).toEqual({ taskId: "C", toColumnId: "C1", toIndex: 0 });
    });
    it("列間: A を D の位置にドロップすると D のindex(0)に挿入", () => {
        const m = computeTaskMove({ activeId: "A", overId: "D", tasks });
        expect(m).toEqual({ taskId: "A", toColumnId: "C2", toIndex: 0 });
    });
    it("列間: 空列ドロッパブル ID なら末尾に追加", () => {
        const onlyA = [t("A", "C1", 0)];
        const m = computeTaskMove({
            activeId: "A",
            overId: `${COLUMN_DROPPABLE_PREFIX}C2`,
            tasks: onlyA,
        });
        expect(m).toEqual({ taskId: "A", toColumnId: "C2", toIndex: 0 });
    });
    it("列間: 既存タスクのある列ドロッパブル ID なら末尾(=length)に追加", () => {
        const m = computeTaskMove({
            activeId: "A",
            overId: `${COLUMN_DROPPABLE_PREFIX}C2`,
            tasks,
        });
        expect(m).toEqual({ taskId: "A", toColumnId: "C2", toIndex: 2 });
    });
    it("存在しない activeId は null", () => {
        expect(computeTaskMove({ activeId: "X", overId: "A", tasks })).toBeNull();
    });
});
