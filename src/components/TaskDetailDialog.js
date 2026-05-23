import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Priority, parsePriority } from "@/lib/priority";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";
export function TaskDetailDialog({ open, task, onSave, onDelete, onClose, }) {
    const [title, setTitle] = useState("");
    const [memo, setMemo] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [priority, setPriority] = useState(Priority.None);
    const [confirmDelete, setConfirmDelete] = useState(false);
    useEffect(() => {
        if (!task)
            return;
        setTitle(task.title);
        setMemo(task.memo ?? "");
        setDueDate(task.dueDate ?? "");
        setPriority(task.priority);
        setConfirmDelete(false);
    }, [task]);
    if (!open || !task)
        return null;
    const titleValid = title.trim().length > 0;
    function handleSave() {
        if (!titleValid)
            return;
        onSave({
            title: title.trim(),
            memo: memo.length > 0 ? memo : null,
            dueDate: dueDate.length > 0 ? dueDate : null,
            priority,
        });
    }
    return (_jsxs(_Fragment, { children: [_jsxs(Modal, { open: open && !confirmDelete, onClose: onClose, title: "\u30BF\u30B9\u30AF\u306E\u8A73\u7D30", children: [_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [_jsx("span", { className: "text-xs font-medium text-gray-600", children: "\u30BF\u30A4\u30C8\u30EB" }), _jsx("input", { "aria-label": "\u30BF\u30A4\u30C8\u30EB", value: title, onChange: (e) => setTitle(e.target.value), className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500" })] }), _jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [_jsx("span", { className: "text-xs font-medium text-gray-600", children: "\u30E1\u30E2" }), _jsx("textarea", { "aria-label": "\u30E1\u30E2", value: memo, onChange: (e) => setMemo(e.target.value), rows: 4, className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500" })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("label", { className: "flex flex-1 flex-col gap-1 text-sm", children: [_jsx("span", { className: "text-xs font-medium text-gray-600", children: "\u671F\u65E5" }), _jsx("input", { "aria-label": "\u671F\u65E5", type: "date", value: dueDate, onChange: (e) => setDueDate(e.target.value), className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500" })] }), _jsxs("label", { className: "flex flex-1 flex-col gap-1 text-sm", children: [_jsx("span", { className: "text-xs font-medium text-gray-600", children: "\u512A\u5148\u5EA6" }), _jsxs("select", { "aria-label": "\u512A\u5148\u5EA6", value: String(priority), onChange: (e) => setPriority(parsePriority(Number(e.target.value))), className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500", children: [_jsx("option", { value: String(Priority.None), children: "\u306A\u3057" }), _jsx("option", { value: String(Priority.Low), children: "\u4F4E" }), _jsx("option", { value: String(Priority.Medium), children: "\u4E2D" }), _jsx("option", { value: String(Priority.High), children: "\u9AD8" })] })] })] })] }), _jsxs("div", { className: "mt-4 flex justify-between", children: [_jsx("button", { type: "button", onClick: () => setConfirmDelete(true), className: "rounded border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50", children: "\u524A\u9664" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: onClose, className: "rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100", children: "\u9589\u3058\u308B" }), _jsx("button", { type: "button", disabled: !titleValid, onClick: handleSave, className: "rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400", children: "\u4FDD\u5B58" })] })] })] }), _jsx(ConfirmDialog, { open: confirmDelete, title: "\u30BF\u30B9\u30AF\u3092\u524A\u9664", destructive: true, confirmLabel: "\u524A\u9664\u3059\u308B", message: `「${task.title}」を削除します。この操作は取り消せません。`, onConfirm: () => {
                    setConfirmDelete(false);
                    onDelete();
                }, onCancel: () => setConfirmDelete(false) })] }));
}
