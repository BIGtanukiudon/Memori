import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Priority, parsePriority } from "@/lib/priority";
import { formatWorkLogTimestamp } from "@/lib/date";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";
export function TaskDetailDialog({ open, task, onSave, onDelete, onClose, workLogs, onAddWorkLog, onUpdateWorkLog, onDeleteWorkLog, }) {
    const [title, setTitle] = useState("");
    const [memo, setMemo] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [priority, setPriority] = useState(Priority.None);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [newLogBody, setNewLogBody] = useState("");
    const [editingLogId, setEditingLogId] = useState(null);
    const [editingLogBody, setEditingLogBody] = useState("");
    const [confirmDeleteLogId, setConfirmDeleteLogId] = useState(null);
    useEffect(() => {
        if (!task)
            return;
        setTitle(task.title);
        setMemo(task.memo ?? "");
        setDueDate(task.dueDate ?? "");
        setPriority(task.priority);
        setConfirmDelete(false);
        setNewLogBody("");
        setEditingLogId(null);
        setConfirmDeleteLogId(null);
    }, [task]);
    if (!open || !task)
        return null;
    const titleValid = title.trim().length > 0;
    const newLogValid = newLogBody.trim().length > 0;
    const editingLogValid = editingLogBody.trim().length > 0;
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
    function handleAddWorkLog() {
        if (!newLogValid)
            return;
        onAddWorkLog(newLogBody.trim());
        setNewLogBody("");
    }
    function handleNewLogKeyDown(e) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleAddWorkLog();
        }
    }
    function startEditLog(log) {
        setEditingLogId(log.id);
        setEditingLogBody(log.body);
    }
    function cancelEditLog() {
        setEditingLogId(null);
        setEditingLogBody("");
    }
    function saveEditLog() {
        if (!editingLogValid || !editingLogId)
            return;
        onUpdateWorkLog(editingLogId, editingLogBody.trim());
        setEditingLogId(null);
        setEditingLogBody("");
    }
    return (_jsxs(_Fragment, { children: [_jsxs(Modal, { open: open && !confirmDelete, onClose: onClose, title: "\u30BF\u30B9\u30AF\u306E\u8A73\u7D30", children: [_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [_jsx("span", { className: "text-xs font-medium text-gray-600", children: "\u30BF\u30A4\u30C8\u30EB" }), _jsx("input", { "aria-label": "\u30BF\u30A4\u30C8\u30EB", value: title, onChange: (e) => setTitle(e.target.value), className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500" })] }), _jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [_jsx("span", { className: "text-xs font-medium text-gray-600", children: "\u30E1\u30E2" }), _jsx("textarea", { "aria-label": "\u30E1\u30E2", value: memo, onChange: (e) => setMemo(e.target.value), rows: 4, className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500" })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("label", { className: "flex flex-1 flex-col gap-1 text-sm", children: [_jsx("span", { className: "text-xs font-medium text-gray-600", children: "\u671F\u65E5" }), _jsx("input", { "aria-label": "\u671F\u65E5", type: "date", value: dueDate, onChange: (e) => setDueDate(e.target.value), className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500" })] }), _jsxs("label", { className: "flex flex-1 flex-col gap-1 text-sm", children: [_jsx("span", { className: "text-xs font-medium text-gray-600", children: "\u512A\u5148\u5EA6" }), _jsxs("select", { "aria-label": "\u512A\u5148\u5EA6", value: String(priority), onChange: (e) => setPriority(parsePriority(Number(e.target.value))), className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500", children: [_jsx("option", { value: String(Priority.None), children: "\u306A\u3057" }), _jsx("option", { value: String(Priority.Low), children: "\u4F4E" }), _jsx("option", { value: String(Priority.Medium), children: "\u4E2D" }), _jsx("option", { value: String(Priority.High), children: "\u9AD8" })] })] })] })] }), _jsxs("div", { className: "mt-4 border-t border-gray-200 pt-3", children: [_jsx("h3", { className: "text-xs font-medium text-gray-600", children: "\u4F5C\u696D\u30ED\u30B0" }), _jsxs("div", { className: "mt-2 flex flex-col gap-1", children: [_jsx("textarea", { "aria-label": "\u4F5C\u696D\u30ED\u30B0\u3092\u8FFD\u52A0", value: newLogBody, onChange: (e) => setNewLogBody(e.target.value), onKeyDown: handleNewLogKeyDown, rows: 2, placeholder: "\u4F5C\u696D\u5185\u5BB9\u3092\u5165\u529B\uFF08Ctrl+Enter\u3067\u8FFD\u52A0\uFF09", className: "rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500" }), _jsx("button", { type: "button", disabled: !newLogValid, onClick: handleAddWorkLog, className: "self-end rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400", children: "\u8FFD\u52A0" })] }), _jsxs("ul", { className: "mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto", children: [workLogs.length === 0 && (_jsx("li", { className: "text-sm text-gray-500", children: "\u4F5C\u696D\u30ED\u30B0\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093" })), workLogs.map((log) => (_jsx("li", { "data-testid": "worklog-item", className: "rounded border border-gray-200 px-2 py-1 text-sm", children: editingLogId === log.id ? (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("textarea", { "aria-label": "\u4F5C\u696D\u30ED\u30B0\u3092\u7DE8\u96C6", value: editingLogBody, onChange: (e) => setEditingLogBody(e.target.value), rows: 2, autoFocus: true, className: "rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: cancelEditLog, className: "rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-100", children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx("button", { type: "button", disabled: !editingLogValid, onClick: saveEditLog, className: "rounded bg-gray-900 px-2 py-0.5 text-xs text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400", children: "\u4FDD\u5B58" })] })] })) : (_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-xs text-gray-500", children: formatWorkLogTimestamp(log.createdAt) }), _jsx("div", { "data-testid": `worklog-body-${log.id}`, className: "whitespace-pre-wrap", children: log.body })] }), _jsxs("div", { className: "flex shrink-0 gap-1", children: [_jsx("button", { type: "button", onClick: () => startEditLog(log), className: "rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-100", children: "\u7DE8\u96C6" }), _jsx("button", { type: "button", "aria-label": "\u4F5C\u696D\u30ED\u30B0\u3092\u524A\u9664", onClick: () => setConfirmDeleteLogId(log.id), className: "rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50", children: "\u524A\u9664" })] })] })) }, log.id)))] })] }), _jsxs("div", { className: "mt-4 flex justify-between", children: [_jsx("button", { type: "button", onClick: () => setConfirmDelete(true), className: "rounded border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50", children: "\u524A\u9664" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: onClose, className: "rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100", children: "\u9589\u3058\u308B" }), _jsx("button", { type: "button", disabled: !titleValid, onClick: handleSave, className: "rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400", children: "\u4FDD\u5B58" })] })] })] }), _jsx(ConfirmDialog, { open: confirmDelete, title: "\u30BF\u30B9\u30AF\u3092\u524A\u9664", destructive: true, confirmLabel: "\u524A\u9664\u3059\u308B", message: `「${task.title}」を削除します。この操作は取り消せません。`, onConfirm: () => {
                    setConfirmDelete(false);
                    onDelete();
                }, onCancel: () => setConfirmDelete(false) }), _jsx(ConfirmDialog, { open: confirmDeleteLogId !== null, title: "\u4F5C\u696D\u30ED\u30B0\u3092\u524A\u9664", destructive: true, confirmLabel: "\u524A\u9664\u3059\u308B", message: "\u3053\u306E\u4F5C\u696D\u30ED\u30B0\u3092\u524A\u9664\u3057\u307E\u3059\u3002\u3053\u306E\u64CD\u4F5C\u306F\u53D6\u308A\u6D88\u305B\u307E\u305B\u3093\u3002", onConfirm: () => {
                    if (confirmDeleteLogId)
                        onDeleteWorkLog(confirmDeleteLogId);
                    setConfirmDeleteLogId(null);
                }, onCancel: () => setConfirmDeleteLogId(null) })] }));
}
