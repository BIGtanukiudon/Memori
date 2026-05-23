import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";
describe("Modal", () => {
    it("openがfalseのときは何も描画しない", () => {
        render(_jsx(Modal, { open: false, onClose: () => { }, title: "\u30BF\u30A4\u30C8\u30EB", children: _jsx("p", { children: "\u672C\u6587" }) }));
        expect(screen.queryByRole("dialog")).toBeNull();
    });
    it("openがtrueのときタイトルと本文が表示される", () => {
        render(_jsx(Modal, { open: true, onClose: () => { }, title: "\u65B0\u898F\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8", children: _jsx("p", { children: "\u30D5\u30A9\u30FC\u30E0\u672C\u4F53" }) }));
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("新規プロジェクト")).toBeInTheDocument();
        expect(screen.getByText("フォーム本体")).toBeInTheDocument();
    });
    it("EscキーでonCloseが呼ばれる", async () => {
        const onClose = vi.fn();
        render(_jsx(Modal, { open: true, onClose: onClose, title: "t", children: _jsx("p", { children: "x" }) }));
        await userEvent.keyboard("{Escape}");
        expect(onClose).toHaveBeenCalled();
    });
    it("オーバーレイクリックでonCloseが呼ばれる", async () => {
        const onClose = vi.fn();
        render(_jsx(Modal, { open: true, onClose: onClose, title: "t", children: _jsx("p", { children: "x" }) }));
        await userEvent.click(screen.getByTestId("modal-overlay"));
        expect(onClose).toHaveBeenCalled();
    });
    it("ダイアログ本体クリックではonCloseが呼ばれない", async () => {
        const onClose = vi.fn();
        render(_jsx(Modal, { open: true, onClose: onClose, title: "t", children: _jsx("p", { children: "\u672C\u6587" }) }));
        await userEvent.click(screen.getByText("本文"));
        expect(onClose).not.toHaveBeenCalled();
    });
});
