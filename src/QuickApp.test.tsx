import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Priority } from "@/lib/priority";

vi.mock("@/db/connection", () => ({
  getDb: vi.fn().mockResolvedValue({ select: vi.fn(), execute: vi.fn() }),
}));

const listProjects = vi.fn();
const listColumns = vi.fn();
const createTaskAction = vi.fn();
const emitTaskCreated = vi.fn();
const hideQuickWindow = vi.fn();

vi.mock("@/db/projects", () => ({
  listProjects: (...a: unknown[]) => listProjects(...a),
}));

vi.mock("@/db/columns", () => ({
  listColumns: (...a: unknown[]) => listColumns(...a),
}));

vi.mock("@/data/taskActions", () => ({
  createTaskAction: (...a: unknown[]) => createTaskAction(...a),
}));

vi.mock("@/lib/events", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/events")>("@/lib/events");
  return {
    ...actual,
    emitTaskCreated: (...a: unknown[]) => emitTaskCreated(...a),
  };
});

vi.mock("@/lib/window", () => ({
  hideQuickWindow: (...a: unknown[]) => hideQuickWindow(...a),
}));

import { QuickApp } from "./QuickApp";

beforeEach(() => {
  listProjects.mockReset();
  listColumns.mockReset();
  createTaskAction.mockReset().mockResolvedValue({ id: "T9" });
  emitTaskCreated.mockReset().mockResolvedValue(undefined);
  hideQuickWindow.mockReset().mockResolvedValue(undefined);
});

describe("QuickApp", () => {
  it("プロジェクト一覧をロードしてダイアログを表示する", async () => {
    listProjects.mockResolvedValue([
      { id: "P1", name: "開発", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" },
    ]);
    listColumns.mockResolvedValue([
      { id: "C1", projectId: "P1", name: "Todo", position: 0 },
    ]);

    render(<QuickApp />);

    await screen.findByDisplayValue("Todo");
    expect(screen.getByLabelText("タスク名")).toBeInTheDocument();
  });

  it("登録: createTaskAction → emitTaskCreated → hideQuickWindow の順で呼ばれる", async () => {
    const user = userEvent.setup();
    listProjects.mockResolvedValue([
      { id: "P1", name: "開発", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" },
    ]);
    listColumns.mockResolvedValue([
      { id: "C1", projectId: "P1", name: "Todo", position: 0 },
    ]);
    createTaskAction.mockResolvedValue({ id: "T9", projectId: "P1" });

    render(<QuickApp />);
    await screen.findByDisplayValue("Todo");

    await user.type(screen.getByLabelText("タスク名"), "新タスク");
    await user.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => expect(hideQuickWindow).toHaveBeenCalled());
    expect(createTaskAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        projectId: "P1",
        columnId: "C1",
        title: "新タスク",
        priority: Priority.None,
      }),
    );
    expect(emitTaskCreated).toHaveBeenCalledWith({
      taskId: "T9",
      projectId: "P1",
    });
  });

  it("キャンセル: hideQuickWindow のみ呼ばれる", async () => {
    const user = userEvent.setup();
    listProjects.mockResolvedValue([
      { id: "P1", name: "開発", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" },
    ]);
    listColumns.mockResolvedValue([
      { id: "C1", projectId: "P1", name: "Todo", position: 0 },
    ]);

    render(<QuickApp />);
    await screen.findByDisplayValue("Todo");
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(hideQuickWindow).toHaveBeenCalled();
    expect(createTaskAction).not.toHaveBeenCalled();
  });

  it("登録後にフォーム状態がリセットされる", async () => {
    const user = userEvent.setup();
    listProjects.mockResolvedValue([
      { id: "P1", name: "開発", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" },
    ]);
    listColumns.mockResolvedValue([
      { id: "C1", projectId: "P1", name: "Todo", position: 0 },
    ]);
    createTaskAction.mockResolvedValue({ id: "T9", projectId: "P1" });

    render(<QuickApp />);
    await screen.findByDisplayValue("Todo");

    const titleInput = screen.getByLabelText("タスク名") as HTMLInputElement;
    await user.type(titleInput, "テスト");
    expect(titleInput.value).toBe("テスト");

    await user.click(screen.getByRole("button", { name: "登録" }));

    // 登録後にフォームがリセットされる
    await waitFor(() => {
      const t = screen.getByLabelText("タスク名") as HTMLInputElement;
      expect(t.value).toBe("");
    });
  });

  it("キャンセル後にもフォーム状態がリセットされる", async () => {
    const user = userEvent.setup();
    listProjects.mockResolvedValue([
      { id: "P1", name: "開発", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" },
    ]);
    listColumns.mockResolvedValue([
      { id: "C1", projectId: "P1", name: "Todo", position: 0 },
    ]);

    render(<QuickApp />);
    await screen.findByDisplayValue("Todo");

    const titleInput = screen.getByLabelText("タスク名") as HTMLInputElement;
    await user.type(titleInput, "やり残し");
    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() => {
      const t = screen.getByLabelText("タスク名") as HTMLInputElement;
      expect(t.value).toBe("");
    });
  });
});
