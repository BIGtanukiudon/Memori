import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Priority, parsePriority, priorityLabel } from "@/lib/priority";
import { formatDueDate, isOverdue } from "@/lib/date";
import { EMPTY_TASK_FILTER, applyTaskFilter, applyTaskSort, } from "@/lib/taskQuery";
const PRIORITY_BADGE = {
    [Priority.None]: "bg-gray-100 text-gray-500",
    [Priority.Low]: "bg-blue-100 text-blue-700",
    [Priority.Medium]: "bg-amber-100 text-amber-700",
    [Priority.High]: "bg-red-100 text-red-700",
};
export function AllTasksView({ projects, columns, tasks, onTaskClick, }) {
    const [filter, setFilter] = useState(EMPTY_TASK_FILTER);
    const [sort, setSort] = useState({ key: "priority", asc: false });
    const projectName = useMemo(() => {
        const m = new Map();
        for (const p of projects)
            m.set(p.id, p.name);
        return m;
    }, [projects]);
    const columnName = useMemo(() => {
        const m = new Map();
        for (const c of columns)
            m.set(c.id, c.name);
        return m;
    }, [columns]);
    const visibleColumns = useMemo(() => {
        if (!filter.projectId)
            return columns;
        return columns.filter((c) => c.projectId === filter.projectId);
    }, [columns, filter.projectId]);
    const filteredTasks = useMemo(() => applyTaskSort(applyTaskFilter(tasks, filter), sort), [tasks, filter, sort]);
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("header", { className: "flex flex-wrap items-end gap-2 border-b border-gray-200 bg-white px-3 py-2 text-xs", children: [_jsxs("label", { className: "flex flex-col", children: [_jsx("span", { className: "text-gray-500", children: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8" }), _jsxs("select", { "aria-label": "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8", value: filter.projectId ?? "", onChange: (e) => setFilter((f) => ({
                                    ...f,
                                    projectId: e.target.value === "" ? null : e.target.value,
                                    // プロジェクト変更時は列フィルタもリセット
                                    columnId: null,
                                })), className: "rounded border border-gray-300 px-2 py-1", children: [_jsx("option", { value: "", children: "\u3059\u3079\u3066" }), projects.map((p) => (_jsx("option", { value: p.id, children: p.name }, p.id)))] })] }), _jsxs("label", { className: "flex flex-col", children: [_jsx("span", { className: "text-gray-500", children: "\u5217" }), _jsxs("select", { "aria-label": "\u5217", value: filter.columnId ?? "", onChange: (e) => setFilter((f) => ({
                                    ...f,
                                    columnId: e.target.value === "" ? null : e.target.value,
                                })), className: "rounded border border-gray-300 px-2 py-1", children: [_jsx("option", { value: "", children: "\u3059\u3079\u3066" }), visibleColumns.map((c) => (_jsxs("option", { value: c.id, children: [c.name, filter.projectId ? "" : ` (${projectName.get(c.projectId) ?? ""})`] }, c.id)))] })] }), _jsxs("label", { className: "flex flex-col", children: [_jsx("span", { className: "text-gray-500", children: "\u512A\u5148\u5EA6" }), _jsxs("select", { "aria-label": "\u512A\u5148\u5EA6", value: filter.priority === null ? "" : String(filter.priority), onChange: (e) => setFilter((f) => ({
                                    ...f,
                                    priority: e.target.value === "" ? null : parsePriority(Number(e.target.value)),
                                })), className: "rounded border border-gray-300 px-2 py-1", children: [_jsx("option", { value: "", children: "\u3059\u3079\u3066" }), _jsx("option", { value: String(Priority.None), children: "\u306A\u3057" }), _jsx("option", { value: String(Priority.Low), children: "\u4F4E" }), _jsx("option", { value: String(Priority.Medium), children: "\u4E2D" }), _jsx("option", { value: String(Priority.High), children: "\u9AD8" })] })] }), _jsxs("label", { className: "flex flex-col", children: [_jsx("span", { className: "text-gray-500", children: "\u671F\u65E5" }), _jsxs("select", { "aria-label": "\u671F\u65E5", value: filter.due, onChange: (e) => setFilter((f) => ({ ...f, due: e.target.value })), className: "rounded border border-gray-300 px-2 py-1", children: [_jsx("option", { value: "all", children: "\u3059\u3079\u3066" }), _jsx("option", { value: "today", children: "\u4ECA\u65E5" }), _jsx("option", { value: "overdue", children: "\u671F\u9650\u5207\u308C" }), _jsx("option", { value: "none", children: "\u671F\u65E5\u306A\u3057" })] })] }), _jsxs("label", { className: "flex flex-1 flex-col", children: [_jsx("span", { className: "text-gray-500", children: "\u691C\u7D22" }), _jsx("input", { "aria-label": "\u691C\u7D22", value: filter.search, onChange: (e) => setFilter((f) => ({ ...f, search: e.target.value })), placeholder: "\u30BF\u30A4\u30C8\u30EB\u30FB\u30E1\u30E2", className: "rounded border border-gray-300 px-2 py-1" })] }), _jsxs("label", { className: "flex flex-col", children: [_jsx("span", { className: "text-gray-500", children: "\u4E26\u3073\u66FF\u3048" }), _jsxs("select", { "aria-label": "\u4E26\u3073\u66FF\u3048", value: sort.key, onChange: (e) => setSort((s) => ({ ...s, key: e.target.value })), className: "rounded border border-gray-300 px-2 py-1", children: [_jsx("option", { value: "priority", children: "\u512A\u5148\u5EA6" }), _jsx("option", { value: "due", children: "\u671F\u65E5" }), _jsx("option", { value: "updated", children: "\u66F4\u65B0\u65E5\u6642" }), _jsx("option", { value: "created", children: "\u4F5C\u6210\u65E5\u6642" })] })] }), _jsx("button", { type: "button", "aria-label": "\u6607\u964D\u5207\u308A\u66FF\u3048", onClick: () => setSort((s) => ({ ...s, asc: !s.asc })), className: "rounded border border-gray-300 px-2 py-1 hover:bg-gray-50", children: sort.asc ? "昇順 ↑" : "降順 ↓" })] }), _jsx("div", { className: "flex-1 overflow-y-auto", children: filteredTasks.length === 0 ? (_jsx("div", { className: "flex h-full items-center justify-center text-sm text-gray-500", children: "\u8A72\u5F53\u3059\u308B\u30BF\u30B9\u30AF\u306F\u3042\u308A\u307E\u305B\u3093" })) : (_jsx("ul", { className: "divide-y divide-gray-100", children: filteredTasks.map((task) => {
                        const overdue = isOverdue(task.dueDate);
                        const due = formatDueDate(task.dueDate);
                        return (_jsxs("li", { "data-testid": "task-row", className: "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50", onClick: () => onTaskClick?.(task), children: [_jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-gray-900", children: task.title }), _jsxs("div", { className: "mt-0.5 text-xs text-gray-500", children: [projectName.get(task.projectId) ?? task.projectId, " / ", columnName.get(task.columnId) ?? task.columnId] })] }), task.priority !== Priority.None && (_jsx("span", { className: `rounded px-1.5 py-0.5 text-xs ${PRIORITY_BADGE[task.priority]}`, children: priorityLabel(task.priority) })), due && (_jsx("span", { className: `text-xs ${overdue ? "font-medium text-red-600" : "text-gray-500"}`, children: due }))] }, task.id));
                    }) })) })] }));
}
