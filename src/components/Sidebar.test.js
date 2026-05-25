import { jsx as _jsx } from "react/jsx-runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useBoardStore } from "@/store/boardStore";
import { Sidebar } from "./Sidebar";
// Sidebarが利用するDB接続とactionsをモック
vi.mock("@/db/connection", () => ({
    getDb: vi.fn().mockResolvedValue({ select: vi.fn(), execute: vi.fn() }),
}));
const createProjectAction = vi.fn();
const renameProjectAction = vi.fn();
const deleteProjectAction = vi.fn();
const countTasksInProject = vi.fn();
const reorderProjectsAction = vi.fn();
vi.mock("@/data/projectActions", () => ({
    createProjectAction: (...a) => createProjectAction(...a),
    renameProjectAction: (...a) => renameProjectAction(...a),
    deleteProjectAction: (...a) => deleteProjectAction(...a),
    countTasksInProject: (...a) => countTasksInProject(...a),
    reorderProjectsAction: (...a) => reorderProjectsAction(...a),
}));
const proj = (id, name, position = 0) => ({
    id,
    name,
    position,
    createdAt: "",
    updatedAt: "",
});
describe("Sidebar", () => {
    beforeEach(() => {
        useBoardStore.getState().reset();
        createProjectAction.mockReset();
        renameProjectAction.mockReset();
        deleteProjectAction.mockReset();
        countTasksInProject.mockReset().mockResolvedValue(0);
        reorderProjectsAction.mockReset().mockResolvedValue(undefined);
    });
    it("プロジェクト一覧を表示する", () => {
        useBoardStore.getState().setProjects([proj("P1", "開発"), proj("P2", "個人")]);
        render(_jsx(Sidebar, {}));
        expect(screen.getByText("開発")).toBeInTheDocument();
        expect(screen.getByText("個人")).toBeInTheDocument();
    });
    it("現在のプロジェクトには aria-current=true がつく", () => {
        useBoardStore.getState().setProjects([proj("P1", "開発"), proj("P2", "個人")]);
        useBoardStore.getState().setCurrentProject("P2");
        render(_jsx(Sidebar, {}));
        expect(screen.getByRole("button", { name: "個人" })).toHaveAttribute("aria-current", "true");
        expect(screen.getByRole("button", { name: "開発" })).toHaveAttribute("aria-current", "false");
    });
    it("クリックで currentProjectId が切り替わる", async () => {
        const user = userEvent.setup();
        useBoardStore.getState().setProjects([proj("P1", "開発"), proj("P2", "個人")]);
        useBoardStore.getState().setCurrentProject("P1");
        render(_jsx(Sidebar, {}));
        await user.click(screen.getByRole("button", { name: "個人" }));
        expect(useBoardStore.getState().currentProjectId).toBe("P2");
    });
    it("プロジェクトが空のときは案内文を表示", () => {
        render(_jsx(Sidebar, {}));
        expect(screen.getByText(/プロジェクトがありません/)).toBeInTheDocument();
    });
    it("「全タスク」エントリをクリックすると onSelectView('all') が呼ばれる", async () => {
        const user = userEvent.setup();
        const onSelectView = vi.fn();
        render(_jsx(Sidebar, { view: "board", onSelectView: onSelectView }));
        await user.click(screen.getByRole("button", { name: "全タスク" }));
        expect(onSelectView).toHaveBeenCalledWith("all");
    });
    it("view=allのとき「全タスク」が aria-current=true", () => {
        render(_jsx(Sidebar, { view: "all", onSelectView: () => { } }));
        expect(screen.getByRole("button", { name: "全タスク" })).toHaveAttribute("aria-current", "true");
    });
    it("プロジェクトをクリックすると onSelectView('board') も呼ばれる", async () => {
        const user = userEvent.setup();
        const onSelectView = vi.fn();
        useBoardStore.getState().setProjects([proj("P1", "開発")]);
        render(_jsx(Sidebar, { view: "all", onSelectView: onSelectView }));
        await user.click(screen.getByRole("button", { name: "開発" }));
        expect(onSelectView).toHaveBeenCalledWith("board");
    });
    it("「新規プロジェクト」ボタンで入力欄を表示しEnterで作成", async () => {
        const user = userEvent.setup();
        createProjectAction.mockResolvedValue({ id: "P9", name: "新", position: 0, createdAt: "", updatedAt: "" });
        render(_jsx(Sidebar, {}));
        await user.click(screen.getByRole("button", { name: "新規プロジェクト" }));
        const input = screen.getByPlaceholderText("プロジェクト名");
        await user.type(input, "新{enter}");
        expect(createProjectAction).toHaveBeenCalledWith(expect.anything(), "新");
    });
    it("入力欄でEscでキャンセル", async () => {
        const user = userEvent.setup();
        render(_jsx(Sidebar, {}));
        await user.click(screen.getByRole("button", { name: "新規プロジェクト" }));
        const input = screen.getByPlaceholderText("プロジェクト名");
        await user.type(input, "x{Escape}");
        expect(screen.queryByPlaceholderText("プロジェクト名")).toBeNull();
        expect(createProjectAction).not.toHaveBeenCalled();
    });
    it("リネームボタンでインライン入力→Enterで反映", async () => {
        const user = userEvent.setup();
        useBoardStore.getState().setProjects([proj("P1", "開発")]);
        renameProjectAction.mockResolvedValue(undefined);
        render(_jsx(Sidebar, {}));
        await user.click(screen.getByRole("button", { name: "開発を編集" }));
        const input = screen.getByDisplayValue("開発");
        await user.clear(input);
        await user.type(input, "DEV{enter}");
        expect(renameProjectAction).toHaveBeenCalledWith(expect.anything(), "P1", "DEV");
    });
    it("削除ボタンで確認ダイアログにタスク件数を表示", async () => {
        const user = userEvent.setup();
        useBoardStore.getState().setProjects([proj("P1", "開発")]);
        countTasksInProject.mockResolvedValue(5);
        render(_jsx(Sidebar, {}));
        await user.click(screen.getByRole("button", { name: "開発を削除" }));
        await waitFor(() => {
            expect(screen.getByText(/5/)).toBeInTheDocument();
        });
        // 削除実行
        await user.click(screen.getByRole("button", { name: "削除" }));
        expect(deleteProjectAction).toHaveBeenCalledWith(expect.anything(), "P1");
    });
    it("削除確認でキャンセルすると削除されない", async () => {
        const user = userEvent.setup();
        useBoardStore.getState().setProjects([proj("P1", "開発")]);
        countTasksInProject.mockResolvedValue(0);
        render(_jsx(Sidebar, {}));
        await user.click(screen.getByRole("button", { name: "開発を削除" }));
        await waitFor(() => screen.getByRole("button", { name: "キャンセル" }));
        await user.click(screen.getByRole("button", { name: "キャンセル" }));
        expect(deleteProjectAction).not.toHaveBeenCalled();
    });
    describe("プロジェクト並び替え", () => {
        it("先頭プロジェクトには上移動ボタンが無効", () => {
            useBoardStore.getState().setProjects([proj("P1", "開発", 0), proj("P2", "個人", 1)]);
            render(_jsx(Sidebar, {}));
            const upBtn = screen.getByRole("button", { name: "開発を上へ" });
            expect(upBtn).toBeDisabled();
        });
        it("末尾プロジェクトには下移動ボタンが無効", () => {
            useBoardStore.getState().setProjects([proj("P1", "開発", 0), proj("P2", "個人", 1)]);
            render(_jsx(Sidebar, {}));
            const downBtn = screen.getByRole("button", { name: "個人を下へ" });
            expect(downBtn).toBeDisabled();
        });
        it("下移動ボタンでreorderProjectsActionが呼ばれる", async () => {
            const user = userEvent.setup();
            useBoardStore.getState().setProjects([proj("P1", "開発", 0), proj("P2", "個人", 1)]);
            render(_jsx(Sidebar, {}));
            await user.click(screen.getByRole("button", { name: "開発を下へ" }));
            expect(reorderProjectsAction).toHaveBeenCalledWith(expect.anything(), ["P2", "P1"]);
        });
        it("上移動ボタンでreorderProjectsActionが呼ばれる", async () => {
            const user = userEvent.setup();
            useBoardStore.getState().setProjects([proj("P1", "開発", 0), proj("P2", "個人", 1)]);
            render(_jsx(Sidebar, {}));
            await user.click(screen.getByRole("button", { name: "個人を上へ" }));
            expect(reorderProjectsAction).toHaveBeenCalledWith(expect.anything(), ["P2", "P1"]);
        });
        it("プロジェクトが1件のときは上下ボタンが両方無効", () => {
            useBoardStore.getState().setProjects([proj("P1", "開発", 0)]);
            render(_jsx(Sidebar, {}));
            expect(screen.getByRole("button", { name: "開発を上へ" })).toBeDisabled();
            expect(screen.getByRole("button", { name: "開発を下へ" })).toBeDisabled();
        });
    });
});
