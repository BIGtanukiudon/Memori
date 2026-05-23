import { useMemo, useState } from "react";
import type { Column, Project, Task } from "@/types/domain";
import { Priority, parsePriority, priorityLabel } from "@/lib/priority";
import { formatDueDate, isOverdue } from "@/lib/date";
import {
  EMPTY_TASK_FILTER,
  applyTaskFilter,
  applyTaskSort,
  type DueFilter,
  type SortKey,
  type TaskFilter,
  type TaskSort,
} from "@/lib/taskQuery";

export interface AllTasksViewProps {
  projects: Project[];
  columns: Column[];
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const PRIORITY_BADGE: Record<Priority, string> = {
  [Priority.None]: "bg-gray-100 text-gray-500",
  [Priority.Low]: "bg-blue-100 text-blue-700",
  [Priority.Medium]: "bg-amber-100 text-amber-700",
  [Priority.High]: "bg-red-100 text-red-700",
};

export function AllTasksView({
  projects,
  columns,
  tasks,
  onTaskClick,
}: AllTasksViewProps) {
  const [filter, setFilter] = useState<TaskFilter>(EMPTY_TASK_FILTER);
  const [sort, setSort] = useState<TaskSort>({ key: "priority", asc: false });

  const projectName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) m.set(p.id, p.name);
    return m;
  }, [projects]);

  const columnName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of columns) m.set(c.id, c.name);
    return m;
  }, [columns]);

  const visibleColumns = useMemo(() => {
    if (!filter.projectId) return columns;
    return columns.filter((c) => c.projectId === filter.projectId);
  }, [columns, filter.projectId]);

  const filteredTasks = useMemo(
    () => applyTaskSort(applyTaskFilter(tasks, filter), sort),
    [tasks, filter, sort],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-end gap-2 border-b border-gray-200 bg-white px-3 py-2 text-xs">
        <label className="flex flex-col">
          <span className="text-gray-500">プロジェクト</span>
          <select
            aria-label="プロジェクト"
            value={filter.projectId ?? ""}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                projectId: e.target.value === "" ? null : e.target.value,
                // プロジェクト変更時は列フィルタもリセット
                columnId: null,
              }))
            }
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="">すべて</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col">
          <span className="text-gray-500">列</span>
          <select
            aria-label="列"
            value={filter.columnId ?? ""}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                columnId: e.target.value === "" ? null : e.target.value,
              }))
            }
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="">すべて</option>
            {visibleColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {filter.projectId ? "" : ` (${projectName.get(c.projectId) ?? ""})`}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col">
          <span className="text-gray-500">優先度</span>
          <select
            aria-label="優先度"
            value={filter.priority === null ? "" : String(filter.priority)}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                priority: e.target.value === "" ? null : parsePriority(Number(e.target.value)),
              }))
            }
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="">すべて</option>
            <option value={String(Priority.None)}>なし</option>
            <option value={String(Priority.Low)}>低</option>
            <option value={String(Priority.Medium)}>中</option>
            <option value={String(Priority.High)}>高</option>
          </select>
        </label>

        <label className="flex flex-col">
          <span className="text-gray-500">期日</span>
          <select
            aria-label="期日"
            value={filter.due}
            onChange={(e) =>
              setFilter((f) => ({ ...f, due: e.target.value as DueFilter }))
            }
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="all">すべて</option>
            <option value="today">今日</option>
            <option value="overdue">期限切れ</option>
            <option value="none">期日なし</option>
          </select>
        </label>

        <label className="flex flex-1 flex-col">
          <span className="text-gray-500">検索</span>
          <input
            aria-label="検索"
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            placeholder="タイトル・メモ"
            className="rounded border border-gray-300 px-2 py-1"
          />
        </label>

        <label className="flex flex-col">
          <span className="text-gray-500">並び替え</span>
          <select
            aria-label="並び替え"
            value={sort.key}
            onChange={(e) => setSort((s) => ({ ...s, key: e.target.value as SortKey }))}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="priority">優先度</option>
            <option value="due">期日</option>
            <option value="updated">更新日時</option>
            <option value="created">作成日時</option>
          </select>
        </label>

        <button
          type="button"
          aria-label="昇降切り替え"
          onClick={() => setSort((s) => ({ ...s, asc: !s.asc }))}
          className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
        >
          {sort.asc ? "昇順 ↑" : "降順 ↓"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            該当するタスクはありません
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredTasks.map((task) => {
              const overdue = isOverdue(task.dueDate);
              const due = formatDueDate(task.dueDate);
              return (
                <li
                  key={task.id}
                  data-testid="task-row"
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="flex-1">
                    <div className="text-gray-900">{task.title}</div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {projectName.get(task.projectId) ?? task.projectId}
                      {" / "}
                      {columnName.get(task.columnId) ?? task.columnId}
                    </div>
                  </div>
                  {task.priority !== Priority.None && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${PRIORITY_BADGE[task.priority]}`}
                    >
                      {priorityLabel(task.priority)}
                    </span>
                  )}
                  {due && (
                    <span
                      className={`text-xs ${overdue ? "font-medium text-red-600" : "text-gray-500"}`}
                    >
                      {due}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
