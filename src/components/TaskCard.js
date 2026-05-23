import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDueDate, isOverdue } from "@/lib/date";
import { Priority, priorityLabel } from "@/lib/priority";
const PRIORITY_CLASS = {
    [Priority.None]: "",
    [Priority.Low]: "bg-blue-100 text-blue-700",
    [Priority.Medium]: "bg-amber-100 text-amber-700",
    [Priority.High]: "bg-red-100 text-red-700",
};
export function TaskCard({ task, onClick, draggable = false }) {
    const sortable = useSortable({
        id: task.id,
        data: { type: "task", columnId: task.columnId },
        disabled: !draggable,
    });
    const overdue = isOverdue(task.dueDate);
    const due = formatDueDate(task.dueDate);
    const style = draggable
        ? {
            transform: CSS.Transform.toString(sortable.transform),
            transition: sortable.transition,
            opacity: sortable.isDragging ? 0.4 : 1,
        }
        : undefined;
    return (_jsxs("div", { ref: draggable ? sortable.setNodeRef : undefined, style: style, ...(draggable ? sortable.attributes : {}), ...(draggable ? sortable.listeners : {}), className: "cursor-pointer rounded border border-gray-200 bg-white p-2 text-sm shadow-sm hover:bg-gray-50", onClick: () => onClick?.(task), "data-task-id": task.id, children: [_jsx("div", { className: "text-gray-900", children: task.title }), _jsxs("div", { className: "mt-1 flex items-center gap-2 text-xs", children: [task.priority !== Priority.None && (_jsx("span", { className: `rounded px-1.5 py-0.5 ${PRIORITY_CLASS[task.priority]}`, children: priorityLabel(task.priority) })), due && (_jsx("span", { className: overdue ? "text-red-600 font-medium" : "text-gray-500", "data-overdue": overdue ? "true" : "false", children: due }))] })] }));
}
