import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Priority } from "@/lib/priority";
import { TaskDetailDialog } from "./TaskDetailDialog";
import type { Task } from "@/types/domain";

const baseTask: Task = {
  id: "T1",
  projectId: "P1",
  columnId: "C1",
  title: "初期タイトル",
  memo: "初期メモ",
  dueDate: "2026-06-01",
  priority: Priority.Medium,
  position: 0,
  createdAt: "",
  updatedAt: "",
};

describe("TaskDetailDialog", () => {
  it("既存タスクの値を初期表示する", () => {
    render(
      <TaskDetailDialog
        open
        task={baseTask}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByLabelText("タイトル")).toHaveValue("初期タイトル");
    expect(screen.getByLabelText("メモ")).toHaveValue("初期メモ");
    expect(screen.getByLabelText("期日")).toHaveValue("2026-06-01");
    expect(screen.getByLabelText("優先度")).toHaveValue(String(Priority.Medium));
  });

  it("保存ボタンで編集内容を onSave に渡す", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <TaskDetailDialog
        open
        task={baseTask}
        onSave={onSave}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    const titleInput = screen.getByLabelText("タイトル");
    await user.clear(titleInput);
    await user.type(titleInput, "新タイトル");

    const memo = screen.getByLabelText("メモ");
    await user.clear(memo);
    await user.type(memo, "新メモ");

    await user.selectOptions(screen.getByLabelText("優先度"), String(Priority.High));

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave).toHaveBeenCalledWith({
      title: "新タイトル",
      memo: "新メモ",
      dueDate: "2026-06-01",
      priority: Priority.High,
    });
  });

  it("期日を空文字にすると dueDate=null で保存", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <TaskDetailDialog
        open
        task={baseTask}
        onSave={onSave}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    const due = screen.getByLabelText("期日");
    await user.clear(due);
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dueDate: null }));
  });

  it("タイトルが空のとき保存ボタンは無効", async () => {
    const user = userEvent.setup();
    render(
      <TaskDetailDialog
        open
        task={baseTask}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    const titleInput = screen.getByLabelText("タイトル");
    await user.clear(titleInput);
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  });

  it("削除ボタンで確認後 onDelete が呼ばれる", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <TaskDetailDialog
        open
        task={baseTask}
        onSave={() => {}}
        onDelete={onDelete}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "削除" }));
    // 確認ダイアログの確定
    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("削除確認をキャンセルすると onDelete は呼ばれない", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <TaskDetailDialog
        open
        task={baseTask}
        onSave={() => {}}
        onDelete={onDelete}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("キャンセルボタンで onClose が呼ばれる", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <TaskDetailDialog
        open
        task={baseTask}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("task が null の場合は何も描画しない", () => {
    render(
      <TaskDetailDialog
        open
        task={null}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByLabelText("タイトル")).toBeNull();
  });
});
