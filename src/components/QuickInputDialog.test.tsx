import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Priority } from "@/lib/priority";
import { QuickInputDialog } from "./QuickInputDialog";
import type { Column, Project } from "@/types/domain";

const projects: Project[] = [
  { id: "P1", name: "開発", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" },
  { id: "P2", name: "個人", position: 1, doneColumnId: null, createdAt: "", updatedAt: "" },
];

const columnsByProject: Record<string, Column[]> = {
  P1: [
    { id: "C1", projectId: "P1", name: "Todo", position: 0 },
    { id: "C2", projectId: "P1", name: "Doing", position: 1 },
  ],
  P2: [{ id: "C3", projectId: "P2", name: "Backlog", position: 0 }],
};

const loadColumns = async (projectId: string): Promise<Column[]> =>
  columnsByProject[projectId] ?? [];

describe("QuickInputDialog", () => {
  it("初期表示: 最初のプロジェクトとその先頭列が選択され、タイトル入力にフォーカス", async () => {
    render(
      <QuickInputDialog
        projects={projects}
        loadColumns={loadColumns}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(await screen.findByLabelText("ステータス")).toHaveValue("C1");
    expect(screen.getByLabelText("プロジェクト")).toHaveValue("P1");
    expect(screen.getByLabelText("タスク名")).toHaveFocus();
  });

  it("プロジェクト変更で列リストが更新される", async () => {
    const user = userEvent.setup();
    render(
      <QuickInputDialog
        projects={projects}
        loadColumns={loadColumns}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    await screen.findByDisplayValue("Todo");
    await user.selectOptions(screen.getByLabelText("プロジェクト"), "P2");
    expect(await screen.findByLabelText("ステータス")).toHaveValue("C3");
  });

  it("Enterで onSubmit が現在の入力で呼ばれる", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <QuickInputDialog
        projects={projects}
        loadColumns={loadColumns}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    await screen.findByDisplayValue("Todo");
    await user.type(screen.getByLabelText("タスク名"), "急ぎタスク");
    await user.selectOptions(screen.getByLabelText("優先度"), String(Priority.High));
    await user.type(screen.getByLabelText("期日"), "2026-06-15");
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith({
      projectId: "P1",
      columnId: "C1",
      title: "急ぎタスク",
      dueDate: "2026-06-15",
      priority: Priority.High,
    });
  });

  it("タスク名が空のときEnterしてもonSubmitは呼ばれない", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <QuickInputDialog
        projects={projects}
        loadColumns={loadColumns}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    await screen.findByDisplayValue("Todo");
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Escで onCancel が呼ばれる", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <QuickInputDialog
        projects={projects}
        loadColumns={loadColumns}
        onSubmit={() => {}}
        onCancel={onCancel}
      />,
    );
    await screen.findByDisplayValue("Todo");
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });

  it("登録ボタンでもonSubmitが呼ばれる", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <QuickInputDialog
        projects={projects}
        loadColumns={loadColumns}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    await screen.findByDisplayValue("Todo");
    await user.type(screen.getByLabelText("タスク名"), "X");
    await user.click(screen.getByRole("button", { name: "登録" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "X", projectId: "P1", columnId: "C1" }),
    );
  });

  it("プロジェクトが0件のとき案内文を表示し、Enterは無効", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <QuickInputDialog
        projects={[]}
        loadColumns={loadColumns}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/プロジェクトがありません/)).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
