import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Priority } from "@/lib/priority";
import { TaskDetailDialog, type TaskDetailDialogProps } from "./TaskDetailDialog";
import type { Task, WorkLog } from "@/types/domain";

const baseTask: Task = {
  id: "T1",
  projectId: "P1",
  columnId: "C1",
  title: "初期タイトル",
  memo: "初期メモ",
  dueDate: "2026-06-01",
  priority: Priority.Medium,
  position: 0,
  completedAt: null,
  createdAt: "",
  updatedAt: "",
};

function renderDialog(overrides: Partial<TaskDetailDialogProps> = {}) {
  const props: TaskDetailDialogProps = {
    open: true,
    task: baseTask,
    onSave: () => {},
    onDelete: () => {},
    onClose: () => {},
    workLogs: [],
    onAddWorkLog: () => {},
    onUpdateWorkLog: () => {},
    onDeleteWorkLog: () => {},
    ...overrides,
  };
  return render(<TaskDetailDialog {...props} />);
}

const workLog = (over: Partial<WorkLog> = {}): WorkLog => ({
  id: "L1",
  taskId: "T1",
  projectId: "P1",
  body: "本文",
  taskTitle: "初期タイトル",
  projectName: "P",
  createdAt: "2026-08-30T00:00:00.000Z",
  updatedAt: "2026-08-30T00:00:00.000Z",
  ...over,
});

describe("TaskDetailDialog", () => {
  it("既存タスクの値を初期表示する", () => {
    renderDialog();
    expect(screen.getByLabelText("タイトル")).toHaveValue("初期タイトル");
    expect(screen.getByLabelText("メモ")).toHaveValue("初期メモ");
    expect(screen.getByLabelText("期日")).toHaveValue("2026-06-01");
    expect(screen.getByLabelText("優先度")).toHaveValue(String(Priority.Medium));
  });

  it("保存ボタンで編集内容を onSave に渡す", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderDialog({ onSave });
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
    renderDialog({ onSave });
    const due = screen.getByLabelText("期日");
    await user.clear(due);
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dueDate: null }));
  });

  it("タイトルが空のとき保存ボタンは無効", async () => {
    const user = userEvent.setup();
    renderDialog();
    const titleInput = screen.getByLabelText("タイトル");
    await user.clear(titleInput);
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  });

  it("削除ボタンで確認後 onDelete が呼ばれる", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderDialog({ onDelete });
    await user.click(screen.getByRole("button", { name: "削除" }));
    // 確認ダイアログの確定
    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("削除確認をキャンセルすると onDelete は呼ばれない", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderDialog({ onDelete });
    await user.click(screen.getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("キャンセルボタンで onClose が呼ばれる", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ onClose });
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("task が null の場合は何も描画しない", () => {
    renderDialog({ task: null });
    expect(screen.queryByLabelText("タイトル")).toBeNull();
  });
});

describe("TaskDetailDialog 作業ログ: 追加と一覧", () => {
  it("0件のとき空メッセージが出る", () => {
    renderDialog({ workLogs: [] });
    expect(screen.getByText("作業ログはまだありません")).toBeInTheDocument();
  });

  it("新しい順(渡された配列の順)で本文と日時が表示される", () => {
    renderDialog({
      workLogs: [
        workLog({ id: "L2", body: "後の作業", createdAt: "2026-08-30T02:00:00.000Z" }),
        workLog({ id: "L1", body: "先の作業", createdAt: "2026-08-30T00:00:00.000Z" }),
      ],
    });
    const items = screen.getAllByTestId("worklog-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("後の作業");
    expect(items[1]).toHaveTextContent("先の作業");
  });

  it("改行を含む本文がそのまま表示される", () => {
    renderDialog({ workLogs: [workLog({ body: "1行目\n2行目" })] });
    const body = screen.getByTestId("worklog-body-L1");
    expect(body).toHaveTextContent("1行目");
    expect(body).toHaveTextContent("2行目");
    expect(body.textContent).toBe("1行目\n2行目");
  });

  it("空白のみの入力では追加ボタンが押せない", async () => {
    const user = userEvent.setup();
    renderDialog();
    const textarea = screen.getByLabelText("作業ログを追加");
    await user.type(textarea, "   ");
    expect(screen.getByRole("button", { name: "追加" })).toBeDisabled();
  });

  it("入力して追加すると onAddWorkLog が本文付きで呼ばれ、入力欄がクリアされる", async () => {
    const user = userEvent.setup();
    const onAddWorkLog = vi.fn();
    renderDialog({ onAddWorkLog });
    const textarea = screen.getByLabelText("作業ログを追加");
    await user.type(textarea, "新しい作業内容");
    await user.click(screen.getByRole("button", { name: "追加" }));
    expect(onAddWorkLog).toHaveBeenCalledWith("新しい作業内容");
    expect(textarea).toHaveValue("");
  });

  it("Ctrl+Enterで追加される", async () => {
    const user = userEvent.setup();
    const onAddWorkLog = vi.fn();
    renderDialog({ onAddWorkLog });
    const textarea = screen.getByLabelText("作業ログを追加");
    await user.type(textarea, "内容");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onAddWorkLog).toHaveBeenCalledWith("内容");
  });

  it("タスクが切り替わると入力欄がクリアされる", async () => {
    const user = userEvent.setup();
    const { rerender } = renderDialog({ task: baseTask });
    const textarea = screen.getByLabelText("作業ログを追加");
    await user.type(textarea, "書きかけ");
    rerender(
      <TaskDetailDialog
        open
        task={{ ...baseTask, id: "T2" }}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
        workLogs={[]}
        onAddWorkLog={() => {}}
        onUpdateWorkLog={() => {}}
        onDeleteWorkLog={() => {}}
      />,
    );
    expect(screen.getByLabelText("作業ログを追加")).toHaveValue("");
  });
});

describe("TaskDetailDialog 作業ログ: 編集と削除", () => {
  it("編集ボタンで入力欄になり、既存本文が入っている", async () => {
    const user = userEvent.setup();
    renderDialog({ workLogs: [workLog({ body: "元の本文" })] });
    await user.click(screen.getByRole("button", { name: "編集" }));
    expect(screen.getByLabelText("作業ログを編集")).toHaveValue("元の本文");
  });

  it("保存で onUpdateWorkLog が呼ばれる", async () => {
    const user = userEvent.setup();
    const onUpdateWorkLog = vi.fn();
    renderDialog({ workLogs: [workLog({ body: "元の本文" })], onUpdateWorkLog });
    const item = screen.getByTestId("worklog-item");
    await user.click(within(item).getByRole("button", { name: "編集" }));
    const editArea = screen.getByLabelText("作業ログを編集");
    await user.clear(editArea);
    await user.type(editArea, "更新後の本文");
    await user.click(within(item).getByRole("button", { name: "保存" }));
    expect(onUpdateWorkLog).toHaveBeenCalledWith("L1", "更新後の本文");
  });

  it("キャンセルで元の本文表示に戻る", async () => {
    const user = userEvent.setup();
    renderDialog({ workLogs: [workLog({ body: "元の本文" })] });
    const item = screen.getByTestId("worklog-item");
    await user.click(within(item).getByRole("button", { name: "編集" }));
    const editArea = screen.getByLabelText("作業ログを編集");
    await user.clear(editArea);
    await user.type(editArea, "変更中");
    await user.click(within(item).getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByLabelText("作業ログを編集")).toBeNull();
    expect(screen.getByTestId("worklog-body-L1")).toHaveTextContent("元の本文");
  });

  it("編集時、空白のみでは保存ボタンが無効", async () => {
    const user = userEvent.setup();
    renderDialog({ workLogs: [workLog({ body: "元の本文" })] });
    const item = screen.getByTestId("worklog-item");
    await user.click(within(item).getByRole("button", { name: "編集" }));
    const editArea = screen.getByLabelText("作業ログを編集");
    await user.clear(editArea);
    await user.type(editArea, "   ");
    expect(within(item).getByRole("button", { name: "保存" })).toBeDisabled();
  });

  it("削除は確認を挟み、確定で onDeleteWorkLog が呼ばれる", async () => {
    const user = userEvent.setup();
    const onDeleteWorkLog = vi.fn();
    renderDialog({ workLogs: [workLog()], onDeleteWorkLog });
    await user.click(screen.getByRole("button", { name: "作業ログを削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(onDeleteWorkLog).toHaveBeenCalledWith("L1");
  });

  it("作業ログの削除確認はタスク削除の確認と独立している", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onDeleteWorkLog = vi.fn();
    renderDialog({ workLogs: [workLog()], onDelete, onDeleteWorkLog });

    await user.click(screen.getByRole("button", { name: "作業ログを削除" }));
    // タスク詳細本体は隠れない(作業ログ用の確認だけが出る)
    expect(screen.getByLabelText("タイトル")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onDeleteWorkLog).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();

    // タスク削除確認は別途正常に動く
    await user.click(screen.getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(onDelete).toHaveBeenCalled();
  });
});
