import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Priority } from "@/lib/priority";
import { AllTasksView } from "./AllTasksView";
import type { Column, Project, Task } from "@/types/domain";

const projects: Project[] = [
  { id: "P1", name: "開発", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" },
  { id: "P2", name: "個人", position: 1, doneColumnId: null, createdAt: "", updatedAt: "" },
];

const columns: Column[] = [
  { id: "C1", projectId: "P1", name: "Todo", position: 0 },
  { id: "C2", projectId: "P1", name: "Doing", position: 1 },
  { id: "C3", projectId: "P2", name: "Backlog", position: 0 },
];

const t = (overrides: Partial<Task>): Task => ({
  id: "id",
  projectId: "P1",
  columnId: "C1",
  title: "タイトル",
  memo: null,
  dueDate: null,
  priority: Priority.None,
  position: 0,
  completedAt: null,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  ...overrides,
});

const tasks: Task[] = [
  t({ id: "A", projectId: "P1", columnId: "C1", title: "Apple", priority: Priority.High, dueDate: "2026-05-13", updatedAt: "2026-05-10T00:00:00.000Z" }),
  t({ id: "B", projectId: "P1", columnId: "C2", title: "Banana", priority: Priority.Medium, dueDate: "2026-04-01", updatedAt: "2026-05-12T00:00:00.000Z" }),
  t({ id: "C", projectId: "P2", columnId: "C3", title: "Cherry", priority: Priority.Low, dueDate: null, updatedAt: "2026-05-11T00:00:00.000Z" }),
];

beforeAll(() => {
  // fake timers は userEvent と相性が悪いため、Date のみ固定
  vi.setSystemTime(new Date("2026-05-13T09:00:00.000Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

describe("AllTasksView", () => {
  beforeEach(() => {});

  it("全タスクのタイトルを表示する", () => {
    render(<AllTasksView projects={projects} columns={columns} tasks={tasks} />);
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.getByText("Cherry")).toBeInTheDocument();
  });

  it("完了列の除外を切り替えると対象タスクだけが非表示・再表示される", async () => {
    const user = userEvent.setup();
    const doneProjects = projects.map((p) => ({ ...p, doneColumnId: p.id === "P1" ? "C2" : null }));
    render(<AllTasksView projects={doneProjects} columns={columns} tasks={tasks} />);

    const checkbox = screen.getByRole("checkbox", { name: "完了列のタスクを除外" });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText("Banana")).toBeInTheDocument();

    await user.click(screen.getByText("完了列のタスクを除外"));
    expect(checkbox).toBeChecked();
    expect(screen.queryByText("Banana")).not.toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Cherry")).toBeInTheDocument();

    await user.keyboard(" ");
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText("Banana")).toBeInTheDocument();
  });

  it("他のフィルタと並び替えの選択を保ち、完了列の指定と併用すると0件になる", async () => {
    const user = userEvent.setup();
    const doneProjects = projects.map((p) => ({ ...p, doneColumnId: p.id === "P1" ? "C2" : null }));
    render(<AllTasksView projects={doneProjects} columns={columns} tasks={tasks} />);
    await user.selectOptions(screen.getByLabelText("プロジェクト"), "P1");
    await user.selectOptions(screen.getByLabelText("列"), "C2");
    await user.selectOptions(screen.getByLabelText("優先度"), String(Priority.Medium));
    await user.selectOptions(screen.getByLabelText("期日"), "overdue");
    await user.type(screen.getByLabelText("検索"), "ban");
    await user.selectOptions(screen.getByLabelText("並び替え"), "updated");
    await user.click(screen.getByRole("button", { name: "昇降切り替え" }));

    const checkbox = screen.getByRole("checkbox", { name: "完了列のタスクを除外" });
    await user.click(checkbox);
    expect(screen.getByText("該当するタスクはありません")).toBeInTheDocument();
    expect(screen.getByLabelText("プロジェクト")).toHaveValue("P1");
    expect(screen.getByLabelText("列")).toHaveValue("C2");
    expect(screen.getByLabelText("優先度")).toHaveValue(String(Priority.Medium));
    expect(screen.getByLabelText("期日")).toHaveValue("overdue");
    expect(screen.getByLabelText("検索")).toHaveValue("ban");
    expect(screen.getByLabelText("並び替え")).toHaveValue("updated");
    expect(screen.getByRole("button", { name: "昇降切り替え" })).toHaveTextContent("昇順");

    await user.click(checkbox);
    expect(screen.getAllByTestId("task-row")).toHaveLength(1);
    expect(screen.getByText("Banana")).toBeInTheDocument();
  });

  it("プロジェクト変更では除外をONのまま保ち、列の選択をリセットする", async () => {
    const user = userEvent.setup();
    const doneProjects = projects.map((p) => ({ ...p, doneColumnId: p.id === "P1" ? "C2" : null }));
    render(<AllTasksView projects={doneProjects} columns={columns} tasks={tasks} />);
    await user.selectOptions(screen.getByLabelText("プロジェクト"), "P1");
    await user.selectOptions(screen.getByLabelText("列"), "C1");
    const checkbox = screen.getByRole("checkbox", { name: "完了列のタスクを除外" });
    await user.click(checkbox);
    await user.selectOptions(screen.getByLabelText("プロジェクト"), "P2");

    expect(checkbox).toBeChecked();
    expect(screen.getByLabelText("列")).toHaveValue("");
    expect(screen.getAllByTestId("task-row")).toHaveLength(1);
    expect(screen.getByText("Cherry")).toBeInTheDocument();
  });

  it("除外後のタスクを選択した順序に並べ、クリックで詳細を開く", async () => {
    const user = userEvent.setup();
    const onTaskClick = vi.fn();
    const doneProjects = projects.map((p) => ({ ...p, doneColumnId: p.id === "P1" ? "C2" : null }));
    render(<AllTasksView projects={doneProjects} columns={columns} tasks={tasks} onTaskClick={onTaskClick} />);
    await user.click(screen.getByRole("checkbox", { name: "完了列のタスクを除外" }));
    await user.selectOptions(screen.getByLabelText("並び替え"), "updated");

    const rows = screen.getAllByTestId("task-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Cherry");
    expect(rows[1]).toHaveTextContent("Apple");
    await user.click(screen.getByText("Cherry"));
    expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: "C" }));
  });

  it("完了列の指定変更と解除が反映されると一覧を再判定する", async () => {
    const user = userEvent.setup();
    const doneProjects = projects.map((p) => ({ ...p, doneColumnId: p.id === "P1" ? "C2" : null }));
    const { rerender } = render(<AllTasksView projects={doneProjects} columns={columns} tasks={tasks} />);
    const checkbox = screen.getByRole("checkbox", { name: "完了列のタスクを除外" });
    await user.click(checkbox);
    expect(screen.queryByText("Banana")).not.toBeInTheDocument();

    const changed = doneProjects.map((p) => ({ ...p, doneColumnId: p.id === "P1" ? "C1" : null }));
    rerender(<AllTasksView projects={changed} columns={columns} tasks={tasks} />);
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();

    rerender(<AllTasksView projects={projects} columns={columns} tasks={tasks} />);
    expect(screen.getAllByTestId("task-row")).toHaveLength(3);
    expect(checkbox).toBeChecked();
  });

  it("タスクが完了列に移動すると消え、通常列へ戻ると再表示される", async () => {
    const user = userEvent.setup();
    const doneProjects = projects.map((p) => ({ ...p, doneColumnId: p.id === "P1" ? "C2" : null }));
    const { rerender } = render(<AllTasksView projects={doneProjects} columns={columns} tasks={tasks} />);
    const checkbox = screen.getByRole("checkbox", { name: "完了列のタスクを除外" });
    await user.click(checkbox);

    const moved = tasks.map((task) => task.id === "A" ? { ...task, columnId: "C2" } : task);
    rerender(<AllTasksView projects={doneProjects} columns={columns} tasks={moved} />);
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.getByText("Cherry")).toBeInTheDocument();

    rerender(<AllTasksView projects={doneProjects} columns={columns} tasks={tasks} />);
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it.each([
    { label: "タスクなし", items: [] },
    { label: "すべて完了列", items: [tasks[1]!] },
  ])("0件でも除外を解除できる（$label）", async ({ items }) => {
    const user = userEvent.setup();
    const doneProjects = projects.map((p) => ({ ...p, doneColumnId: p.id === "P1" ? "C2" : null }));
    render(<AllTasksView projects={doneProjects} columns={columns} tasks={items} />);
    const checkbox = screen.getByRole("checkbox", { name: "完了列のタスクを除外" });
    await user.click(checkbox);
    expect(screen.getByText("該当するタスクはありません")).toBeInTheDocument();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(screen.queryAllByTestId("task-row")).toHaveLength(items.length);
  });

  it("プロジェクトフィルタで絞り込み", async () => {
    const user = userEvent.setup();
    render(<AllTasksView projects={projects} columns={columns} tasks={tasks} />);
    await user.selectOptions(screen.getByLabelText("プロジェクト"), "P2");
    expect(screen.queryByText("Apple")).toBeNull();
    expect(screen.queryByText("Banana")).toBeNull();
    expect(screen.getByText("Cherry")).toBeInTheDocument();
  });

  it("優先度フィルタで絞り込み", async () => {
    const user = userEvent.setup();
    render(<AllTasksView projects={projects} columns={columns} tasks={tasks} />);
    await user.selectOptions(screen.getByLabelText("優先度"), String(Priority.High));
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.queryByText("Banana")).toBeNull();
  });

  it("期日フィルタ overdue", async () => {
    const user = userEvent.setup();
    render(<AllTasksView projects={projects} columns={columns} tasks={tasks} />);
    await user.selectOptions(screen.getByLabelText("期日"), "overdue");
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.queryByText("Apple")).toBeNull();
  });

  it("検索フィルタ", async () => {
    const user = userEvent.setup();
    render(<AllTasksView projects={projects} columns={columns} tasks={tasks} />);
    await user.type(screen.getByLabelText("検索"), "app");
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.queryByText("Banana")).toBeNull();
  });

  it("ソート: 優先度降順 (デフォルト)で High → Med → Low の順", () => {
    render(<AllTasksView projects={projects} columns={columns} tasks={tasks} />);
    const rows = screen.getAllByTestId("task-row");
    expect(rows.map((r) => r.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Apple"),
        expect.stringContaining("Banana"),
        expect.stringContaining("Cherry"),
      ]),
    );
    // 1番上が Apple (High)
    expect(rows[0]!.textContent).toContain("Apple");
  });

  it("ソート: 期日昇順に切り替え", async () => {
    const user = userEvent.setup();
    render(<AllTasksView projects={projects} columns={columns} tasks={tasks} />);
    await user.selectOptions(screen.getByLabelText("並び替え"), "due");
    // デフォルトは降順なので昇順切り替えボタンをクリック
    await user.click(screen.getByRole("button", { name: "昇降切り替え" }));
    // due asc: Banana (04-01), Apple (05-13), Cherry (null末尾)
    const rows = screen.getAllByTestId("task-row");
    expect(rows[0]!.textContent).toContain("Banana");
    expect(rows[1]!.textContent).toContain("Apple");
    expect(rows[2]!.textContent).toContain("Cherry");
  });

  it("行クリックで onTaskClick が呼ばれる", async () => {
    const user = userEvent.setup();
    const onTaskClick = vi.fn();
    render(
      <AllTasksView
        projects={projects}
        columns={columns}
        tasks={tasks}
        onTaskClick={onTaskClick}
      />,
    );
    await user.click(screen.getByText("Apple"));
    expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: "A" }));
  });

  it("該当タスクが0件の場合は空状態を表示", async () => {
    const user = userEvent.setup();
    render(<AllTasksView projects={projects} columns={columns} tasks={tasks} />);
    await user.type(screen.getByLabelText("検索"), "存在しない");
    expect(screen.getByText(/該当するタスク/)).toBeInTheDocument();
  });

  it("プロジェクト名と列名を行に表示する", () => {
    render(<AllTasksView projects={projects} columns={columns} tasks={tasks} />);
    const appleRow = screen.getAllByTestId("task-row").find((r) => r.textContent?.includes("Apple"));
    expect(appleRow?.textContent).toContain("開発");
    expect(appleRow?.textContent).toContain("Todo");
  });
});
