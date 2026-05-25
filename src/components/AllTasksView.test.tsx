import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Priority } from "@/lib/priority";
import { AllTasksView } from "./AllTasksView";
import type { Column, Project, Task } from "@/types/domain";

const projects: Project[] = [
  { id: "P1", name: "開発", position: 0, createdAt: "", updatedAt: "" },
  { id: "P2", name: "個人", position: 1, createdAt: "", updatedAt: "" },
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
