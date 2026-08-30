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
const emitWorkLogAdded = vi.fn();
const listenQuickModeChanged = vi.fn();
const hideQuickWindow = vi.fn();
const isTauriRuntime = vi.fn();
const getLastLoggedTaskId = vi.fn();
const searchTasksForLog = vi.fn();
const createWorkLogAction = vi.fn();
const invokeMock = vi.fn();

vi.mock("@/db/projects", () => ({
  listProjects: (...a: unknown[]) => listProjects(...a),
}));

vi.mock("@/db/columns", () => ({
  listColumns: (...a: unknown[]) => listColumns(...a),
}));

vi.mock("@/db/tasks", () => ({
  searchTasksForLog: (...a: unknown[]) => searchTasksForLog(...a),
}));

vi.mock("@/db/workLogs", () => ({
  getLastLoggedTaskId: (...a: unknown[]) => getLastLoggedTaskId(...a),
}));

vi.mock("@/data/taskActions", () => ({
  createTaskAction: (...a: unknown[]) => createTaskAction(...a),
}));

vi.mock("@/data/workLogActions", () => ({
  createWorkLogAction: (...a: unknown[]) => createWorkLogAction(...a),
}));

vi.mock("@/lib/events", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/events")>("@/lib/events");
  return {
    ...actual,
    emitTaskCreated: (...a: unknown[]) => emitTaskCreated(...a),
    emitWorkLogAdded: (...a: unknown[]) => emitWorkLogAdded(...a),
    listenQuickModeChanged: (...a: unknown[]) => listenQuickModeChanged(...a),
  };
});

vi.mock("@/lib/window", () => ({
  hideQuickWindow: (...a: unknown[]) => hideQuickWindow(...a),
  isTauriRuntime: (...a: unknown[]) => isTauriRuntime(...a),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...a: unknown[]) => invokeMock(...a),
}));

import { QuickApp } from "./QuickApp";

beforeEach(() => {
  listProjects.mockReset();
  listColumns.mockReset();
  createTaskAction.mockReset().mockResolvedValue({ id: "T9" });
  emitTaskCreated.mockReset().mockResolvedValue(undefined);
  emitWorkLogAdded.mockReset().mockResolvedValue(undefined);
  listenQuickModeChanged.mockReset().mockResolvedValue(() => {});
  hideQuickWindow.mockReset().mockResolvedValue(undefined);
  isTauriRuntime.mockReset().mockReturnValue(false);
  getLastLoggedTaskId.mockReset().mockResolvedValue(null);
  searchTasksForLog.mockReset().mockResolvedValue([]);
  createWorkLogAction.mockReset();
  invokeMock.mockReset().mockResolvedValue("task");
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

describe("QuickApp - ログモード", () => {
  it("quick:mode(log)イベントを受けてQuickLogDialogに切り替わる", async () => {
    listProjects.mockResolvedValue([]);
    let captured: ((p: { mode: "task" | "log" }) => void) | null = null;
    listenQuickModeChanged.mockImplementationOnce(async (cb) => {
      captured = cb;
      return () => {};
    });

    render(<QuickApp />);
    await waitFor(() => expect(captured).not.toBeNull());
    captured!({ mode: "log" });

    expect(await screen.findByLabelText("対象タスク")).toBeInTheDocument();
    expect(screen.getByLabelText("本文")).toBeInTheDocument();
  });

  it("起動時にinvoke(get_quick_mode)がlogを返す場合、最初からログダイアログを表示する", async () => {
    listProjects.mockResolvedValue([]);
    isTauriRuntime.mockReturnValue(true);
    invokeMock.mockResolvedValue("log");

    render(<QuickApp />);

    expect(await screen.findByLabelText("対象タスク")).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith("get_quick_mode");
  });

  it("既定タスクの解決: getLastLoggedTaskIdの結果を対象タスク欄に表示する", async () => {
    listProjects.mockResolvedValue([]);
    getLastLoggedTaskId.mockResolvedValue("T1");
    searchTasksForLog.mockResolvedValue([
      { id: "T1", title: "実装する", projectId: "P1", projectName: "開発", completedAt: null },
    ]);
    let captured: ((p: { mode: "task" | "log" }) => void) | null = null;
    listenQuickModeChanged.mockImplementationOnce(async (cb) => {
      captured = cb;
      return () => {};
    });

    render(<QuickApp />);
    await waitFor(() => expect(captured).not.toBeNull());
    captured!({ mode: "log" });

    await waitFor(() =>
      expect(screen.getByLabelText("対象タスク")).toHaveValue("開発 / 実装する"),
    );
  });

  it("ログ追加: createWorkLogAction → emitWorkLogAdded → hideQuickWindow の順で呼ばれる", async () => {
    const user = userEvent.setup();
    listProjects.mockResolvedValue([]);
    getLastLoggedTaskId.mockResolvedValue("T1");
    searchTasksForLog.mockResolvedValue([
      { id: "T1", title: "実装する", projectId: "P1", projectName: "開発", completedAt: null },
    ]);
    createWorkLogAction.mockResolvedValue({
      id: "L1",
      taskId: "T1",
      projectId: "P1",
      body: "作業した",
      taskTitle: "実装する",
      projectName: "開発",
      createdAt: "",
      updatedAt: "",
    });
    let captured: ((p: { mode: "task" | "log" }) => void) | null = null;
    listenQuickModeChanged.mockImplementationOnce(async (cb) => {
      captured = cb;
      return () => {};
    });

    render(<QuickApp />);
    await waitFor(() => expect(captured).not.toBeNull());
    captured!({ mode: "log" });
    await waitFor(() =>
      expect(screen.getByLabelText("対象タスク")).toHaveValue("開発 / 実装する"),
    );

    await user.type(screen.getByLabelText("本文"), "作業した");
    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => expect(hideQuickWindow).toHaveBeenCalled());
    expect(createWorkLogAction).toHaveBeenCalledWith(expect.anything(), {
      taskId: "T1",
      body: "作業した",
    });
    expect(emitWorkLogAdded).toHaveBeenCalledWith({ taskId: "T1", projectId: "P1" });
  });

  it("ログのキャンセル: hideQuickWindowのみ呼ばれる", async () => {
    const user = userEvent.setup();
    listProjects.mockResolvedValue([]);
    let captured: ((p: { mode: "task" | "log" }) => void) | null = null;
    listenQuickModeChanged.mockImplementationOnce(async (cb) => {
      captured = cb;
      return () => {};
    });

    render(<QuickApp />);
    await waitFor(() => expect(captured).not.toBeNull());
    captured!({ mode: "log" });
    await screen.findByLabelText("対象タスク");

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(hideQuickWindow).toHaveBeenCalled();
    expect(createWorkLogAction).not.toHaveBeenCalled();
  });
});
