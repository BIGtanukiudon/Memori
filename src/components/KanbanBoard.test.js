import { jsx as _jsx } from "react/jsx-runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Priority } from "@/lib/priority";
import { useBoardStore } from "@/store/boardStore";
import { KanbanBoard } from "./KanbanBoard";
vi.mock("@/db/connection", () => ({
    getDb: vi.fn().mockResolvedValue({ select: vi.fn(), execute: vi.fn() }),
}));
const createColumnAction = vi.fn();
const renameColumnAction = vi.fn();
const deleteColumnCascadeAction = vi.fn();
const deleteColumnAfterMoveAction = vi.fn();
vi.mock("@/data/columnActions", () => ({
    createColumnAction: (...a) => createColumnAction(...a),
    renameColumnAction: (...a) => renameColumnAction(...a),
    deleteColumnCascadeAction: (...a) => deleteColumnCascadeAction(...a),
    deleteColumnAfterMoveAction: (...a) => deleteColumnAfterMoveAction(...a),
    countTasksInColumn: (id) => useBoardStore.getState().tasks.filter((t) => t.columnId === id).length,
}));
const createTaskAction = vi.fn();
const updateTaskAction = vi.fn();
const deleteTaskAction = vi.fn();
const moveTaskAction = vi.fn();
vi.mock("@/data/taskActions", () => ({
    createTaskAction: (...a) => createTaskAction(...a),
    updateTaskAction: (...a) => updateTaskAction(...a),
    deleteTaskAction: (...a) => deleteTaskAction(...a),
    moveTaskAction: (...a) => moveTaskAction(...a),
}));
const project = {
    id: "P",
    name: "開発",
    createdAt: "",
    updatedAt: "",
};
const col = (id, position, name) => ({
    id,
    projectId: "P",
    name,
    position,
});
const task = (id, columnId, position, title) => ({
    id,
    projectId: "P",
    columnId,
    title,
    memo: null,
    dueDate: null,
    priority: Priority.None,
    position,
    createdAt: "",
    updatedAt: "",
});
describe("KanbanBoard", () => {
    beforeEach(() => {
        useBoardStore.getState().reset();
        createColumnAction.mockReset().mockResolvedValue(undefined);
        renameColumnAction.mockReset().mockResolvedValue(undefined);
        deleteColumnCascadeAction.mockReset().mockResolvedValue(undefined);
        deleteColumnAfterMoveAction.mockReset().mockResolvedValue(undefined);
        createTaskAction.mockReset().mockResolvedValue(undefined);
        updateTaskAction.mockReset().mockResolvedValue(undefined);
        deleteTaskAction.mockReset().mockResolvedValue(undefined);
        moveTaskAction.mockReset().mockResolvedValue(undefined);
    });
    it("currentProjectが無い場合は空メッセージを表示する", () => {
        render(_jsx(KanbanBoard, {}));
        expect(screen.getByText(/プロジェクトを選択/)).toBeInTheDocument();
    });
    it("currentProjectがあれば列が position 順で表示される", () => {
        const s = useBoardStore.getState();
        s.setProjects([project]);
        s.setCurrentProject("P");
        s.setColumns([col("C1", 1, "Doing"), col("C0", 0, "Todo")]);
        s.setTasks([task("T0", "C0", 0, "タスクA"), task("T1", "C1", 0, "タスクB")]);
        render(_jsx(KanbanBoard, {}));
        const headings = screen.getAllByRole("heading", { level: 2 });
        expect(headings.map((h) => h.textContent)).toEqual(["Todo", "Doing"]);
        expect(screen.getByText("タスクA")).toBeInTheDocument();
        expect(screen.getByText("タスクB")).toBeInTheDocument();
    });
    it("「列を追加」ボタンで入力欄を表示しEnterでcreateColumnActionが呼ばれる", async () => {
        const user = userEvent.setup();
        const s = useBoardStore.getState();
        s.setProjects([project]);
        s.setCurrentProject("P");
        s.setColumns([col("C0", 0, "Todo")]);
        render(_jsx(KanbanBoard, {}));
        await user.click(screen.getByRole("button", { name: "列を追加" }));
        const input = screen.getByPlaceholderText("列名");
        await user.type(input, "新列{enter}");
        expect(createColumnAction).toHaveBeenCalledWith(expect.anything(), "P", "新列");
    });
    it("列のリネームでrenameColumnActionが呼ばれる", async () => {
        const user = userEvent.setup();
        const s = useBoardStore.getState();
        s.setProjects([project]);
        s.setCurrentProject("P");
        s.setColumns([col("C0", 0, "Todo")]);
        render(_jsx(KanbanBoard, {}));
        await user.click(screen.getByRole("button", { name: "Todoを編集" }));
        const input = screen.getByDisplayValue("Todo");
        await user.clear(input);
        await user.type(input, "DONE{enter}");
        expect(renameColumnAction).toHaveBeenCalledWith(expect.anything(), "C0", "DONE");
    });
    it("タスク0件の列の削除は確認なしでcascade削除", async () => {
        const user = userEvent.setup();
        const s = useBoardStore.getState();
        s.setProjects([project]);
        s.setCurrentProject("P");
        s.setColumns([col("C0", 0, "Empty"), col("C1", 1, "Other")]);
        s.setTasks([]);
        render(_jsx(KanbanBoard, {}));
        await user.click(screen.getByRole("button", { name: "Emptyを削除" }));
        expect(deleteColumnCascadeAction).toHaveBeenCalledWith(expect.anything(), "C0");
    });
    it("タスクありの列の削除は3択ダイアログを表示", async () => {
        const user = userEvent.setup();
        const s = useBoardStore.getState();
        s.setProjects([project]);
        s.setCurrentProject("P");
        s.setColumns([col("C0", 0, "Todo"), col("C1", 1, "Doing")]);
        s.setTasks([task("T0", "C0", 0, "あ")]);
        render(_jsx(KanbanBoard, {}));
        await user.click(screen.getByRole("button", { name: "Todoを削除" }));
        expect(screen.getByText(/列「Todo」/)).toBeInTheDocument();
        expect(deleteColumnCascadeAction).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", { name: /まとめて削除/ }));
        expect(deleteColumnCascadeAction).toHaveBeenCalledWith(expect.anything(), "C0");
    });
    it("3択ダイアログで「移動して削除」を選ぶとdeleteColumnAfterMoveActionが呼ばれる", async () => {
        const user = userEvent.setup();
        const s = useBoardStore.getState();
        s.setProjects([project]);
        s.setCurrentProject("P");
        s.setColumns([col("C0", 0, "Todo"), col("C1", 1, "Doing")]);
        s.setTasks([task("T0", "C0", 0, "あ")]);
        render(_jsx(KanbanBoard, {}));
        await user.click(screen.getByRole("button", { name: "Todoを削除" }));
        await waitFor(() => screen.getByRole("button", { name: /移動して削除/ }));
        await user.click(screen.getByRole("button", { name: /移動して削除/ }));
        expect(deleteColumnAfterMoveAction).toHaveBeenCalledWith(expect.anything(), "C0", "C1");
    });
    it("列内の「タスク追加」でcreateTaskActionが呼ばれる", async () => {
        const user = userEvent.setup();
        const s = useBoardStore.getState();
        s.setProjects([project]);
        s.setCurrentProject("P");
        s.setColumns([col("C0", 0, "Todo")]);
        render(_jsx(KanbanBoard, {}));
        await user.click(screen.getByRole("button", { name: "Todoにタスクを追加" }));
        await user.type(screen.getByPlaceholderText("タスク名"), "新タスク{enter}");
        expect(createTaskAction).toHaveBeenCalledWith(expect.anything(), {
            projectId: "P",
            columnId: "C0",
            title: "新タスク",
        });
    });
    it("タスククリックで詳細モーダルが開き、保存でupdateTaskActionが呼ばれる", async () => {
        const user = userEvent.setup();
        const s = useBoardStore.getState();
        s.setProjects([project]);
        s.setCurrentProject("P");
        s.setColumns([col("C0", 0, "Todo")]);
        s.setTasks([task("T0", "C0", 0, "編集対象")]);
        render(_jsx(KanbanBoard, {}));
        await user.click(screen.getByText("編集対象"));
        const titleInput = screen.getByLabelText("タイトル");
        expect(titleInput).toHaveValue("編集対象");
        await user.clear(titleInput);
        await user.type(titleInput, "更新後");
        await user.click(screen.getByRole("button", { name: "保存" }));
        expect(updateTaskAction).toHaveBeenCalledWith(expect.anything(), "T0", expect.objectContaining({ title: "更新後" }));
    });
    it("詳細モーダルの削除でdeleteTaskActionが呼ばれる", async () => {
        const user = userEvent.setup();
        const s = useBoardStore.getState();
        s.setProjects([project]);
        s.setCurrentProject("P");
        s.setColumns([col("C0", 0, "Todo")]);
        s.setTasks([task("T0", "C0", 0, "削除対象")]);
        render(_jsx(KanbanBoard, {}));
        await user.click(screen.getByText("削除対象"));
        await user.click(screen.getByRole("button", { name: "削除" }));
        await user.click(screen.getByRole("button", { name: "削除する" }));
        expect(deleteTaskAction).toHaveBeenCalledWith(expect.anything(), "T0");
    });
});
