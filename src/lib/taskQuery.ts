import type { Task } from "@/types/domain";
import type { Priority } from "./priority";
import { isOverdue, todayIso } from "./date";

export type DueFilter = "all" | "today" | "overdue" | "none";

export interface TaskFilter {
  projectId: string | null;
  columnId: string | null;
  priority: Priority | null;
  due: DueFilter;
  search: string;
}

export type SortKey = "due" | "priority" | "updated" | "created";

export interface TaskSort {
  key: SortKey;
  asc: boolean;
}

export const EMPTY_TASK_FILTER: TaskFilter = {
  projectId: null,
  columnId: null,
  priority: null,
  due: "all",
  search: "",
};

export function applyTaskFilter(tasks: Task[], filter: TaskFilter): Task[] {
  const today = todayIso();
  const search = filter.search.trim().toLowerCase();
  return tasks.filter((t) => {
    if (filter.projectId !== null && t.projectId !== filter.projectId) return false;
    if (filter.columnId !== null && t.columnId !== filter.columnId) return false;
    if (filter.priority !== null && t.priority !== filter.priority) return false;
    if (filter.due === "today" && t.dueDate !== today) return false;
    if (filter.due === "overdue" && !isOverdue(t.dueDate)) return false;
    if (filter.due === "none" && t.dueDate !== null) return false;
    if (search.length > 0) {
      const hay = `${t.title} ${t.memo ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function compareNullable<T>(
  a: T | null,
  b: T | null,
  cmp: (x: T, y: T) => number,
  asc: boolean,
): number {
  // null は常に末尾
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return asc ? cmp(a, b) : cmp(b, a);
}

export function applyTaskSort(tasks: Task[], sort: TaskSort): Task[] {
  const copy = [...tasks];
  const strCmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const numCmp = (a: number, b: number) => a - b;

  switch (sort.key) {
    case "due":
      copy.sort((a, b) => compareNullable(a.dueDate, b.dueDate, strCmp, sort.asc));
      break;
    case "priority":
      copy.sort((a, b) => (sort.asc ? a.priority - b.priority : b.priority - a.priority));
      break;
    case "updated":
      copy.sort((a, b) =>
        sort.asc ? strCmp(a.updatedAt, b.updatedAt) : strCmp(b.updatedAt, a.updatedAt),
      );
      break;
    case "created":
      copy.sort((a, b) =>
        sort.asc ? strCmp(a.createdAt, b.createdAt) : strCmp(b.createdAt, a.createdAt),
      );
      break;
    default: {
      const exhaustive: never = sort.key;
      void exhaustive;
      void numCmp;
    }
  }
  return copy;
}
