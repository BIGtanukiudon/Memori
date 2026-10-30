import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useBoardStore } from "@/store/boardStore";
import { App } from "./App";
const { select, listeners } = vi.hoisted(() => ({
    select: vi.fn(),
    listeners: new Map(),
}));
// TauriのDBとイベントだけを置き換え、画面とデータ取得処理は実際のものを使う。
vi.mock("@tauri-apps/plugin-sql", () => ({
    default: { load: async () => ({ select, execute: vi.fn() }) },
}));
vi.mock("@tauri-apps/api/event", () => ({
    listen: async (name, callback) => {
        listeners.set(name, callback);
        return () => { listeners.delete(name); };
    },
    emit: vi.fn().mockResolvedValue(undefined),
}));
let doneColumnId;
beforeEach(() => {
    useBoardStore.getState().reset();
    listeners.clear();
    vi.stubGlobal("__TAURI_INTERNALS__", {});
    doneColumnId = "C2";
    select.mockReset().mockImplementation(async (query) => {
        if (query.includes("FROM projects")) {
            return [{ id: "P", name: "開発", position: 0, done_column_id: doneColumnId, created_at: "", updated_at: "" }];
        }
        if (query.includes("FROM columns")) {
            return [
                { id: "C1", project_id: "P", name: "Todo", position: 0 },
                { id: "C2", project_id: "P", name: "Done", position: 1 },
            ];
        }
        if (query.includes("FROM tasks")) {
            return [
                { id: "T1", project_id: "P", column_id: "C1", title: "作業A" },
                { id: "T2", project_id: "P", column_id: "C2", title: "作業B" },
            ].map((row) => ({
                ...row, memo: null, due_date: null, priority: 0, position: 0,
                completed_at: null, created_at: "", updated_at: "",
            }));
        }
        throw new Error(`予期しないクエリ: ${query}`);
    });
});
afterEach(() => {
    vi.unstubAllGlobals();
});
describe("App - 全タスクの完了列フィルタ", () => {
    it.each(["フォーカス復帰", "プロジェクト変更イベント", "タスク更新イベント"])("%sで完了列の最新の指定を反映し、除外をONのまま保つ", async (trigger) => {
        const user = userEvent.setup();
        render(_jsx(App, {}));
        await screen.findByRole("button", { name: "開発" });
        await user.click(screen.getByRole("button", { name: "全タスク" }));
        await screen.findByText("作業B");
        const checkbox = screen.getByRole("checkbox", { name: "完了列のタスクを除外" });
        await user.click(checkbox);
        expect(screen.getByText("作業A")).toBeInTheDocument();
        expect(screen.queryByText("作業B")).not.toBeInTheDocument();
        doneColumnId = "C1";
        if (trigger === "フォーカス復帰") {
            fireEvent.focus(window);
        }
        else {
            await act(async () => {
                const name = trigger === "プロジェクト変更イベント" ? "project:changed" : "task:updated";
                const callback = listeners.get(name);
                expect(callback).toBeDefined();
                callback({ payload: { projectId: "P", taskId: "T1" } });
            });
        }
        await waitFor(() => {
            expect(screen.getByText("作業B")).toBeInTheDocument();
            expect(screen.queryByText("作業A")).not.toBeInTheDocument();
        });
        expect(checkbox).toBeChecked();
    });
    it("カンバン画面から全タスク画面を開き直すと除外がOFFになる", async () => {
        const user = userEvent.setup();
        render(_jsx(App, {}));
        await screen.findByRole("button", { name: "開発" });
        await user.click(screen.getByRole("button", { name: "全タスク" }));
        await screen.findByText("作業B");
        await user.click(screen.getByRole("checkbox", { name: "完了列のタスクを除外" }));
        expect(screen.queryByText("作業B")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "開発" }));
        expect(screen.queryByRole("checkbox", { name: "完了列のタスクを除外" })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "全タスク" }));
        expect(screen.getByRole("checkbox", { name: "完了列のタスクを除外" })).not.toBeChecked();
        expect(await screen.findByText("作業B")).toBeInTheDocument();
        expect(screen.getByText("作業A")).toBeInTheDocument();
    });
});
