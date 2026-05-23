import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";
describe("ConfirmDialog", () => {
    it("タイトル・メッセージ・ボタンが表示される", () => {
        render(_jsx(ConfirmDialog, { open: true, title: "\u524A\u9664\u3057\u307E\u3059\u304B?", message: "\u3053\u306E\u64CD\u4F5C\u306F\u53D6\u308A\u6D88\u305B\u307E\u305B\u3093", confirmLabel: "\u524A\u9664", onConfirm: () => { }, onCancel: () => { } }));
        expect(screen.getByText("削除しますか?")).toBeInTheDocument();
        expect(screen.getByText("この操作は取り消せません")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "削除" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
    });
    it("確認ボタンクリックでonConfirmが呼ばれる", async () => {
        const onConfirm = vi.fn();
        render(_jsx(ConfirmDialog, { open: true, title: "t", message: "m", confirmLabel: "OK", onConfirm: onConfirm, onCancel: () => { } }));
        await userEvent.click(screen.getByRole("button", { name: "OK" }));
        expect(onConfirm).toHaveBeenCalled();
    });
    it("キャンセルボタンクリックでonCancelが呼ばれる", async () => {
        const onCancel = vi.fn();
        render(_jsx(ConfirmDialog, { open: true, title: "t", message: "m", confirmLabel: "OK", onConfirm: () => { }, onCancel: onCancel }));
        await userEvent.click(screen.getByRole("button", { name: "キャンセル" }));
        expect(onCancel).toHaveBeenCalled();
    });
    it("destructive指定で確認ボタンが赤色クラスになる", () => {
        render(_jsx(ConfirmDialog, { open: true, title: "t", message: "m", confirmLabel: "\u524A\u9664", destructive: true, onConfirm: () => { }, onCancel: () => { } }));
        expect(screen.getByRole("button", { name: "削除" }).className).toMatch(/bg-red/);
    });
});
