import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("openがfalseのときは何も描画しない", () => {
    render(
      <Modal open={false} onClose={() => {}} title="タイトル">
        <p>本文</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("openがtrueのときタイトルと本文が表示される", () => {
    render(
      <Modal open onClose={() => {}} title="新規プロジェクト">
        <p>フォーム本体</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("新規プロジェクト")).toBeInTheDocument();
    expect(screen.getByText("フォーム本体")).toBeInTheDocument();
  });

  it("EscキーでonCloseが呼ばれる", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="t">
        <p>x</p>
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("オーバーレイクリックでonCloseが呼ばれる", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="t">
        <p>x</p>
      </Modal>,
    );
    await userEvent.click(screen.getByTestId("modal-overlay"));
    expect(onClose).toHaveBeenCalled();
  });

  it("ダイアログ本体クリックではonCloseが呼ばれない", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="t">
        <p>本文</p>
      </Modal>,
    );
    await userEvent.click(screen.getByText("本文"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
