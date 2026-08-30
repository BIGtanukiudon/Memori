import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickLogDialog } from "./QuickLogDialog";
import type { TaskSearchResult } from "@/db/tasks";

const taskA: TaskSearchResult = {
  id: "T1",
  title: "実装する",
  projectId: "P1",
  projectName: "開発",
  completedAt: null,
};
const taskB: TaskSearchResult = {
  id: "T2",
  title: "完了済みタスク",
  projectId: "P1",
  projectName: "開発",
  completedAt: "2026-08-29T00:00:00.000Z",
};

describe("QuickLogDialog", () => {
  it("既定タスクがある場合: 対象タスク欄に「プロジェクト名 / タスク名」が入り、本文欄にフォーカス", async () => {
    render(
      <QuickLogDialog
        initialTask={taskA}
        searchTasks={vi.fn().mockResolvedValue([])}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("対象タスク")).toHaveValue("開発 / 実装する");
    expect(screen.getByLabelText("本文")).toHaveFocus();
  });

  it("既定タスクがない場合: 対象タスク欄にフォーカス", async () => {
    const searchTasks = vi.fn().mockResolvedValue([]);
    render(
      <QuickLogDialog
        initialTask={null}
        searchTasks={searchTasks}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("対象タスク")).toHaveValue("");
    expect(screen.getByLabelText("対象タスク")).toHaveFocus();
    // フォーカスにより自動的に検索が走るのを待ってactの警告を防ぐ
    await waitFor(() => expect(searchTasks).toHaveBeenCalledWith(""));
  });

  it("検索で対象タスクを切り替えられる", async () => {
    const user = userEvent.setup();
    const searchTasks = vi.fn().mockResolvedValue([taskB]);
    render(
      <QuickLogDialog
        initialTask={taskA}
        searchTasks={searchTasks}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    const taskInput = screen.getByLabelText("対象タスク");
    await user.click(taskInput);
    await user.type(taskInput, "完了");

    await waitFor(() => expect(searchTasks).toHaveBeenCalledWith("完了"));
    const option = await screen.findByText(/開発 \/ 完了済みタスク/);
    await user.click(option);

    expect(taskInput).toHaveValue("開発 / 完了済みタスク");
  });

  it("完了タスクの候補には完了マークが付く", async () => {
    const user = userEvent.setup();
    const searchTasks = vi.fn().mockResolvedValue([taskA, taskB]);
    render(
      <QuickLogDialog
        initialTask={null}
        searchTasks={searchTasks}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    await user.click(screen.getByLabelText("対象タスク"));
    await waitFor(() => expect(searchTasks).toHaveBeenCalledWith(""));
    expect(await screen.findByText(/完了済みタスク/)).toBeInTheDocument();
    expect(screen.getByText("(完了)")).toBeInTheDocument();
  });

  it("Ctrl+Enterで onSubmit が呼ばれる", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <QuickLogDialog
        initialTask={taskA}
        searchTasks={vi.fn().mockResolvedValue([])}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const body = screen.getByLabelText("本文");
    await user.type(body, "仕様を確認した");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmit).toHaveBeenCalledWith({ taskId: "T1", body: "仕様を確認した" });
  });

  it("Escで onCancel が呼ばれる", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <QuickLogDialog
        initialTask={taskA}
        searchTasks={vi.fn().mockResolvedValue([])}
        onSubmit={() => {}}
        onCancel={onCancel}
      />,
    );
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });

  it("本文が空白のみでは追加ボタンが無効", async () => {
    const user = userEvent.setup();
    render(
      <QuickLogDialog
        initialTask={taskA}
        searchTasks={vi.fn().mockResolvedValue([])}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    const body = screen.getByLabelText("本文");
    await user.type(body, "   ");
    expect(screen.getByRole("button", { name: "追加" })).toBeDisabled();
  });

  it("対象タスク未選択では追加ボタンが無効", async () => {
    const user = userEvent.setup();
    render(
      <QuickLogDialog
        initialTask={null}
        searchTasks={vi.fn().mockResolvedValue([])}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    const body = screen.getByLabelText("本文");
    await user.click(body);
    await user.type(body, "本文あり");
    expect(screen.getByRole("button", { name: "追加" })).toBeDisabled();
  });

  it("追加ボタンでもonSubmitが呼ばれる", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <QuickLogDialog
        initialTask={taskA}
        searchTasks={vi.fn().mockResolvedValue([])}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    await user.type(screen.getByLabelText("本文"), "本文");
    await user.click(screen.getByRole("button", { name: "追加" }));
    expect(onSubmit).toHaveBeenCalledWith({ taskId: "T1", body: "本文" });
  });
});
