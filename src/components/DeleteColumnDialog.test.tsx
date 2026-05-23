import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteColumnDialog } from "./DeleteColumnDialog";

const sourceColumn = { id: "C1", projectId: "P", name: "Todo", position: 0 };
const otherColumns = [
  { id: "C2", projectId: "P", name: "Doing", position: 1 },
  { id: "C3", projectId: "P", name: "Done", position: 2 },
];

describe("DeleteColumnDialog", () => {
  it("列名とタスク件数を表示する", () => {
    render(
      <DeleteColumnDialog
        open
        column={sourceColumn}
        otherColumns={otherColumns}
        taskCount={3}
        onCascade={() => {}}
        onMoveAndDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/Todo/)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it("「まとめて削除」でonCascadeが呼ばれる", async () => {
    const onCascade = vi.fn();
    render(
      <DeleteColumnDialog
        open
        column={sourceColumn}
        otherColumns={otherColumns}
        taskCount={3}
        onCascade={onCascade}
        onMoveAndDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /まとめて削除/ }));
    expect(onCascade).toHaveBeenCalled();
  });

  it("移動先列を選択して「移動して削除」でonMoveAndDeleteが呼ばれる", async () => {
    const onMoveAndDelete = vi.fn();
    render(
      <DeleteColumnDialog
        open
        column={sourceColumn}
        otherColumns={otherColumns}
        taskCount={3}
        onCascade={() => {}}
        onMoveAndDelete={onMoveAndDelete}
        onCancel={() => {}}
      />,
    );
    // デフォルトで最初の他列が選ばれている想定
    await userEvent.click(screen.getByRole("button", { name: /移動して削除/ }));
    expect(onMoveAndDelete).toHaveBeenCalledWith("C2");
  });

  it("移動先列を変更できる", async () => {
    const onMoveAndDelete = vi.fn();
    render(
      <DeleteColumnDialog
        open
        column={sourceColumn}
        otherColumns={otherColumns}
        taskCount={3}
        onCascade={() => {}}
        onMoveAndDelete={onMoveAndDelete}
        onCancel={() => {}}
      />,
    );
    await userEvent.selectOptions(screen.getByRole("combobox"), "C3");
    await userEvent.click(screen.getByRole("button", { name: /移動して削除/ }));
    expect(onMoveAndDelete).toHaveBeenCalledWith("C3");
  });

  it("他列が無いときは「移動して削除」ボタンが無効", () => {
    render(
      <DeleteColumnDialog
        open
        column={sourceColumn}
        otherColumns={[]}
        taskCount={3}
        onCascade={() => {}}
        onMoveAndDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /移動して削除/ })).toBeDisabled();
  });

  it("キャンセルでonCancelが呼ばれる", async () => {
    const onCancel = vi.fn();
    render(
      <DeleteColumnDialog
        open
        column={sourceColumn}
        otherColumns={otherColumns}
        taskCount={3}
        onCascade={() => {}}
        onMoveAndDelete={() => {}}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
