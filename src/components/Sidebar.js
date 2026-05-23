import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useBoardStore } from "@/store/boardStore";
import { getDb } from "@/db/connection";
import { countTasksInProject, createProjectAction, deleteProjectAction, renameProjectAction, } from "@/data/projectActions";
import { ConfirmDialog } from "./ConfirmDialog";
export function Sidebar({ view = "board", onSelectView } = {}) {
    const projects = useBoardStore((s) => s.projects);
    const currentProjectId = useBoardStore((s) => s.currentProjectId);
    const setCurrentProject = useBoardStore((s) => s.setCurrentProject);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState("");
    const [deleteState, setDeleteState] = useState(null);
    async function handleCreate() {
        const name = newName.trim();
        if (!name) {
            setCreating(false);
            return;
        }
        const db = await getDb();
        await createProjectAction(db, name);
        setNewName("");
        setCreating(false);
    }
    function handleCreateKey(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            void handleCreate();
        }
        else if (e.key === "Escape") {
            e.preventDefault();
            setCreating(false);
            setNewName("");
        }
    }
    async function handleRename(id) {
        const name = editingName.trim();
        if (!name) {
            setEditingId(null);
            return;
        }
        const db = await getDb();
        await renameProjectAction(db, id, name);
        setEditingId(null);
    }
    function handleRenameKey(e, id) {
        if (e.key === "Enter") {
            e.preventDefault();
            void handleRename(id);
        }
        else if (e.key === "Escape") {
            e.preventDefault();
            setEditingId(null);
        }
    }
    async function openDelete(id, name) {
        const db = await getDb();
        const count = await countTasksInProject(db, id);
        setDeleteState({ id, name, taskCount: count });
    }
    async function confirmDelete() {
        if (!deleteState)
            return;
        const db = await getDb();
        await deleteProjectAction(db, deleteState.id);
        setDeleteState(null);
    }
    return (_jsxs("aside", { className: "flex h-full w-56 shrink-0 flex-col border-r border-gray-200 bg-white", children: [_jsx("nav", { className: "flex flex-col border-b border-gray-200", children: _jsx("button", { type: "button", "aria-current": view === "all", onClick: () => onSelectView?.("all"), className: `px-3 py-2 text-left text-sm hover:bg-gray-100 ${view === "all" ? "bg-gray-100 font-medium text-gray-900" : "text-gray-700"}`, children: "\u5168\u30BF\u30B9\u30AF" }) }), _jsxs("div", { className: "flex items-center justify-between border-b border-gray-200 px-3 py-2", children: [_jsx("span", { className: "text-xs font-semibold text-gray-500", children: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8" }), _jsx("button", { type: "button", onClick: () => {
                            setCreating(true);
                            setNewName("");
                        }, "aria-label": "\u65B0\u898F\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8", className: "rounded px-1 text-sm text-gray-600 hover:bg-gray-100", children: "\uFF0B" })] }), creating && (_jsx("div", { className: "border-b border-gray-100 px-2 py-1", children: _jsx("input", { autoFocus: true, value: newName, placeholder: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u540D", onChange: (e) => setNewName(e.target.value), onKeyDown: handleCreateKey, onBlur: () => void handleCreate(), className: "w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500" }) })), projects.length === 0 && !creating ? (_jsx("div", { className: "px-3 py-4 text-sm text-gray-500", children: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u304C\u3042\u308A\u307E\u305B\u3093" })) : (_jsx("nav", { className: "flex flex-col", children: projects.map((p) => {
                    const active = p.id === currentProjectId;
                    const isEditing = editingId === p.id;
                    return (_jsx("div", { className: "group flex items-center", children: isEditing ? (_jsx("input", { autoFocus: true, value: editingName, onChange: (e) => setEditingName(e.target.value), onKeyDown: (e) => handleRenameKey(e, p.id), onBlur: () => void handleRename(p.id), className: "m-1 flex-1 rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500" })) : (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", "aria-current": active && view === "board", onClick: () => {
                                        setCurrentProject(p.id);
                                        onSelectView?.("board");
                                    }, className: `flex-1 px-3 py-2 text-left text-sm hover:bg-gray-100 ${active && view === "board"
                                        ? "bg-gray-100 font-medium text-gray-900"
                                        : "text-gray-700"}`, children: p.name }), _jsx("button", { type: "button", "aria-label": `${p.name}を編集`, onClick: () => {
                                        setEditingId(p.id);
                                        setEditingName(p.name);
                                    }, className: "px-1 text-xs text-gray-400 opacity-0 hover:text-gray-700 group-hover:opacity-100", children: "\u270E" }), _jsx("button", { type: "button", "aria-label": `${p.name}を削除`, onClick: () => void openDelete(p.id, p.name), className: "px-1 pr-2 text-xs text-gray-400 opacity-0 hover:text-red-600 group-hover:opacity-100", children: "\u2715" })] })) }, p.id));
                }) })), _jsx(ConfirmDialog, { open: !!deleteState, title: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u3092\u524A\u9664", destructive: true, confirmLabel: "\u524A\u9664", message: deleteState && (_jsxs(_Fragment, { children: ["\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u300C", deleteState.name, "\u300D\u3068\u914D\u4E0B\u306E", _jsx("strong", { className: "px-1", children: deleteState.taskCount }), "\u4EF6\u306E\u30BF\u30B9\u30AF\u3092\u524A\u9664\u3057\u307E\u3059\u3002\u3053\u306E\u64CD\u4F5C\u306F\u53D6\u308A\u6D88\u305B\u307E\u305B\u3093\u3002"] })), onConfirm: () => void confirmDelete(), onCancel: () => setDeleteState(null) })] }));
}
