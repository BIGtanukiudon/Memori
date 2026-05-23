import { isOverdue, todayIso } from "./date";
export const EMPTY_TASK_FILTER = {
    projectId: null,
    columnId: null,
    priority: null,
    due: "all",
    search: "",
};
export function applyTaskFilter(tasks, filter) {
    const today = todayIso();
    const search = filter.search.trim().toLowerCase();
    return tasks.filter((t) => {
        if (filter.projectId !== null && t.projectId !== filter.projectId)
            return false;
        if (filter.columnId !== null && t.columnId !== filter.columnId)
            return false;
        if (filter.priority !== null && t.priority !== filter.priority)
            return false;
        if (filter.due === "today" && t.dueDate !== today)
            return false;
        if (filter.due === "overdue" && !isOverdue(t.dueDate))
            return false;
        if (filter.due === "none" && t.dueDate !== null)
            return false;
        if (search.length > 0) {
            const hay = `${t.title} ${t.memo ?? ""}`.toLowerCase();
            if (!hay.includes(search))
                return false;
        }
        return true;
    });
}
function compareNullable(a, b, cmp, asc) {
    // null は常に末尾
    if (a === null && b === null)
        return 0;
    if (a === null)
        return 1;
    if (b === null)
        return -1;
    return asc ? cmp(a, b) : cmp(b, a);
}
export function applyTaskSort(tasks, sort) {
    const copy = [...tasks];
    const strCmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
    const numCmp = (a, b) => a - b;
    switch (sort.key) {
        case "due":
            copy.sort((a, b) => compareNullable(a.dueDate, b.dueDate, strCmp, sort.asc));
            break;
        case "priority":
            copy.sort((a, b) => (sort.asc ? a.priority - b.priority : b.priority - a.priority));
            break;
        case "updated":
            copy.sort((a, b) => sort.asc ? strCmp(a.updatedAt, b.updatedAt) : strCmp(b.updatedAt, a.updatedAt));
            break;
        case "created":
            copy.sort((a, b) => sort.asc ? strCmp(a.createdAt, b.createdAt) : strCmp(b.createdAt, a.createdAt));
            break;
        default: {
            const exhaustive = sort.key;
            void exhaustive;
            void numCmp;
        }
    }
    return copy;
}
