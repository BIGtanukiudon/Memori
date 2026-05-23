import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Modal } from "./Modal";
export function ConfirmDialog({ open, title, message, confirmLabel, destructive, onConfirm, onCancel, }) {
    const confirmClass = destructive
        ? "bg-red-600 text-white hover:bg-red-700"
        : "bg-gray-900 text-white hover:bg-gray-800";
    return (_jsxs(Modal, { open: open, onClose: onCancel, title: title, children: [_jsx("div", { className: "text-sm text-gray-700", children: message }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: onCancel, className: "rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100", children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx("button", { type: "button", onClick: onConfirm, className: `rounded px-3 py-1 text-sm ${confirmClass}`, children: confirmLabel })] })] }));
}
