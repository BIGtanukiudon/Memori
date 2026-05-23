import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Priority } from "@/lib/priority";
import { KanbanColumn } from "./KanbanColumn";
const column = { id: "C0", projectId: "P", name: "Todo", position: 0 };
const task = (id, title) => ({
    id,
    projectId: "P",
    columnId: "C0",
    title,
    memo: null,
    dueDate: null,
    priority: Priority.None,
    position: 0,
    createdAt: "",
    updatedAt: "",
});
describe("KanbanColumn", () => {
    it("列名が表示される", () => {
        render(_jsx(KanbanColumn, { column: column, tasks: [] }));
        expect(screen.getByText("Todo")).toBeInTheDocument();
    });
    it("タスク件数が表示される", () => {
        render(_jsx(KanbanColumn, { column: column, tasks: [task("T1", "a"), task("T2", "b")] }));
        expect(screen.getByText("2")).toBeInTheDocument();
    });
    it("配下タスクのタイトルが順に表示される", () => {
        render(_jsx(KanbanColumn, { column: column, tasks: [task("T1", "あ"), task("T2", "い")] }));
        expect(screen.getByText("あ")).toBeInTheDocument();
        expect(screen.getByText("い")).toBeInTheDocument();
    });
    it("編集ボタン → インライン入力 → Enterで onRename が呼ばれる", async () => {
        const onRename = vi.fn();
        render(_jsx(KanbanColumn, { column: column, tasks: [], onRename: onRename }));
        await userEvent.click(screen.getByRole("button", { name: "Todoを編集" }));
        const input = screen.getByDisplayValue("Todo");
        await userEvent.clear(input);
        await userEvent.type(input, "DOING{enter}");
        expect(onRename).toHaveBeenCalledWith("C0", "DOING");
    });
    it("Escで編集をキャンセルする", async () => {
        const onRename = vi.fn();
        render(_jsx(KanbanColumn, { column: column, tasks: [], onRename: onRename }));
        await userEvent.click(screen.getByRole("button", { name: "Todoを編集" }));
        const input = screen.getByDisplayValue("Todo");
        await userEvent.type(input, "x{Escape}");
        expect(onRename).not.toHaveBeenCalled();
    });
    it("削除ボタンで onRequestDelete が呼ばれる", async () => {
        const onRequestDelete = vi.fn();
        render(_jsx(KanbanColumn, { column: column, tasks: [], onRequestDelete: onRequestDelete }));
        await userEvent.click(screen.getByRole("button", { name: "Todoを削除" }));
        expect(onRequestDelete).toHaveBeenCalledWith(column);
    });
    it("「タスク追加」でインライン入力→Enterで onAddTask が呼ばれる", async () => {
        const onAddTask = vi.fn();
        render(_jsx(KanbanColumn, { column: column, tasks: [], onAddTask: onAddTask }));
        await userEvent.click(screen.getByRole("button", { name: "Todoにタスクを追加" }));
        const input = screen.getByPlaceholderText("タスク名");
        await userEvent.type(input, "やること{enter}");
        expect(onAddTask).toHaveBeenCalledWith("C0", "やること");
    });
    it("タスク追加で空文字は無視される", async () => {
        const onAddTask = vi.fn();
        render(_jsx(KanbanColumn, { column: column, tasks: [], onAddTask: onAddTask }));
        await userEvent.click(screen.getByRole("button", { name: "Todoにタスクを追加" }));
        const input = screen.getByPlaceholderText("タスク名");
        await userEvent.type(input, "   {enter}");
        expect(onAddTask).not.toHaveBeenCalled();
    });
});
