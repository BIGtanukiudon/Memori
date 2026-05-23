import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { columnDroppableId } from "@/lib/dnd";
import { TaskCard } from "./TaskCard";
export function KanbanColumn({ column, tasks, onTaskClick, onRename, onRequestDelete, onAddTask, draggable = false, }) {
    const { setNodeRef: setDroppableRef } = useDroppable({
        id: columnDroppableId(column.id),
        data: { type: "column-drop", columnId: column.id },
        disabled: !draggable,
    });
    const sortable = useSortable({
        id: column.id,
        data: { type: "column", columnId: column.id },
        disabled: !draggable,
    });
    const sortableStyle = draggable
        ? {
            transform: CSS.Transform.toString(sortable.transform),
            transition: sortable.transition,
            opacity: sortable.isDragging ? 0.5 : 1,
        }
        : undefined;
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(column.name);
    const [adding, setAdding] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    function commitRename() {
        const trimmed = name.trim();
        if (!trimmed || trimmed === column.name) {
            setEditing(false);
            setName(column.name);
            return;
        }
        onRename?.(column.id, trimmed);
        setEditing(false);
    }
    function handleKey(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            commitRename();
        }
        else if (e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
            setName(column.name);
        }
    }
    return (_jsxs("section", { ref: draggable ? sortable.setNodeRef : undefined, style: sortableStyle, ...(draggable ? sortable.attributes : {}), className: "flex w-72 shrink-0 flex-col rounded-lg bg-gray-100 p-2", "data-column-id": column.id, children: [_jsx("header", { className: "group mb-2 flex items-center justify-between px-1", children: editing ? (_jsx("input", { autoFocus: true, value: name, onChange: (e) => setName(e.target.value), onKeyDown: handleKey, onBlur: commitRename, className: "flex-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-sm outline-none focus:border-gray-500" })) : (_jsxs(_Fragment, { children: [draggable && (_jsx("button", { type: "button", "aria-label": `${column.name}を並べ替え`, ...sortable.listeners, className: "mr-1 cursor-grab px-1 text-xs text-gray-400 hover:text-gray-700 active:cursor-grabbing", children: "\u22EE\u22EE" })), _jsx("h2", { className: "flex-1 text-sm font-semibold text-gray-800", children: column.name }), _jsx("span", { className: "rounded bg-gray-200 px-1.5 text-xs text-gray-600", children: tasks.length }), onRename && (_jsx("button", { type: "button", "aria-label": `${column.name}を編集`, onClick: () => {
                                setName(column.name);
                                setEditing(true);
                            }, className: "ml-1 px-1 text-xs text-gray-400 opacity-0 hover:text-gray-700 group-hover:opacity-100", children: "\u270E" })), onRequestDelete && (_jsx("button", { type: "button", "aria-label": `${column.name}を削除`, onClick: () => onRequestDelete(column), className: "px-1 text-xs text-gray-400 opacity-0 hover:text-red-600 group-hover:opacity-100", children: "\u2715" }))] })) }), _jsx("div", { ref: setDroppableRef, className: "flex min-h-[2rem] flex-col gap-2", children: _jsx(SortableContext, { items: tasks.map((t) => t.id), strategy: verticalListSortingStrategy, children: tasks.map((t) => (_jsx(TaskCard, { task: t, onClick: onTaskClick, draggable: draggable }, t.id))) }) }), onAddTask && (_jsx("div", { className: "mt-2", children: adding ? (_jsx("input", { autoFocus: true, value: newTitle, placeholder: "\u30BF\u30B9\u30AF\u540D", onChange: (e) => setNewTitle(e.target.value), onKeyDown: (e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            const title = newTitle.trim();
                            if (title.length > 0) {
                                onAddTask(column.id, title);
                            }
                            setNewTitle("");
                            setAdding(false);
                        }
                        else if (e.key === "Escape") {
                            e.preventDefault();
                            setNewTitle("");
                            setAdding(false);
                        }
                    }, onBlur: () => {
                        const title = newTitle.trim();
                        if (title.length > 0) {
                            onAddTask(column.id, title);
                        }
                        setNewTitle("");
                        setAdding(false);
                    }, className: "w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-gray-500" })) : (_jsx("button", { type: "button", "aria-label": `${column.name}にタスクを追加`, onClick: () => {
                        setNewTitle("");
                        setAdding(true);
                    }, className: "w-full rounded border border-dashed border-gray-300 bg-white/50 px-2 py-1 text-xs text-gray-500 hover:bg-white", children: "\uFF0B \u30BF\u30B9\u30AF\u8FFD\u52A0" })) }))] }));
}
