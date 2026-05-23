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

vi.mock("@/data/projectActions", () => ({
  createProjectAction: (...a: unknown[]) => createProjectAction(...a),
  renameProjectAction: (...a: unknown[]) => renameProjectAction(...a),
  deleteProjectAction: (...a: unknown[]) => deleteProjectAction(...a),
  countTasksInProject: (...a: unknown[]) => countTasksInProject(...a),
}));

const proj = (id: string, name: string) => ({
  id,
  name,
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
  });

  it("プロジェクト一覧を表示する", () => {
    useBoardStore.getState().setProjects([proj("P1", "開発"), proj("P2", "個人")]);
    render(<Sidebar />);
    expect(screen.getByText("開発")).toBeInTheDocument();
    expect(screen.getByText("個人")).toBeInTheDocument();
  });

  it("現在のプロジェクトには aria-current=true がつく", () => {
    useBoardStore.getState().setProjects([proj("P1", "開発"), proj("P2", "個人")]);
    useBoardStore.getState().setCurrentProject("P2");
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: "個人" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "開発" })).toHaveAttribute(
      "aria-current",
      "false",
    );
  });

  it("クリックで currentProjectId が切り替わる", async () => {
    const user = userEvent.setup();
    useBoardStore.getState().setProjects([proj("P1", "開発"), proj("P2", "個人")]);
    useBoardStore.getState().setCurrentProject("P1");
    render(<Sidebar />);

    await user.click(screen.getByRole("button", { name: "個人" }));
    expect(useBoardStore.getState().currentProjectId).toBe("P2");
  });

  it("プロジェクトが空のときは案内文を表示", () => {
    render(<Sidebar />);
    expect(screen.getByText(/プロジェクトがありません/)).toBeInTheDocument();
  });

  it("「全タスク」エントリをクリックすると onSelectView('all') が呼ばれる", async () => {
    const user = userEvent.setup();
    const onSelectView = vi.fn();
    render(<Sidebar view="board" onSelectView={onSelectView} />);
    await user.click(screen.getByRole("button", { name: "全タスク" }));
    expect(onSelectView).toHaveBeenCalledWith("all");
  });

  it("view=allのとき「全タスク」が aria-current=true", () => {
    render(<Sidebar view="all" onSelectView={() => {}} />);
    expect(screen.getByRole("button", { name: "全タスク" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("プロジェクトをクリックすると onSelectView('board') も呼ばれる", async () => {
    const user = userEvent.setup();
    const onSelectView = vi.fn();
    useBoardStore.getState().setProjects([proj("P1", "開発")]);
    render(<Sidebar view="all" onSelectView={onSelectView} />);
    await user.click(screen.getByRole("button", { name: "開発" }));
    expect(onSelectView).toHaveBeenCalledWith("board");
  });

  it("「新規プロジェクト」ボタンで入力欄を表示しEnterで作成", async () => {
    const user = userEvent.setup();
    createProjectAction.mockResolvedValue({ id: "P9", name: "新", createdAt: "", updatedAt: "" });
    render(<Sidebar />);

    await user.click(screen.getByRole("button", { name: "新規プロジェクト" }));
    const input = screen.getByPlaceholderText("プロジェクト名");
    await user.type(input, "新{enter}");

    expect(createProjectAction).toHaveBeenCalledWith(expect.anything(), "新");
  });

  it("入力欄でEscでキャンセル", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
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
    render(<Sidebar />);

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
    render(<Sidebar />);

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
    render(<Sidebar />);

    await user.click(screen.getByRole("button", { name: "開発を削除" }));
    await waitFor(() => screen.getByRole("button", { name: "キャンセル" }));
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(deleteProjectAction).not.toHaveBeenCalled();
  });
});
