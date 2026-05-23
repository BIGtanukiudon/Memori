import { useState, type KeyboardEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Column, Task } from "@/types/domain";
import { columnDroppableId } from "@/lib/dnd";
import { TaskCard } from "./TaskCard";

export interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onRename?: (id: string, newName: string) => void;
  onRequestDelete?: (column: Column) => void;
  onAddTask?: (columnId: string, title: string) => void;
  draggable?: boolean;
}

export function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onRename,
  onRequestDelete,
  onAddTask,
  draggable = false,
}: KanbanColumnProps) {
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

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
      setName(column.name);
    }
  }

  return (
    <section
      ref={draggable ? sortable.setNodeRef : undefined}
      style={sortableStyle}
      {...(draggable ? sortable.attributes : {})}
      className="flex w-72 shrink-0 flex-col rounded-lg bg-gray-100 p-2"
      data-column-id={column.id}
    >
      <header className="group mb-2 flex items-center justify-between px-1">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKey}
            onBlur={commitRename}
            className="flex-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-sm outline-none focus:border-gray-500"
          />
        ) : (
          <>
            {draggable && (
              <button
                type="button"
                aria-label={`${column.name}を並べ替え`}
                {...sortable.listeners}
                className="mr-1 cursor-grab px-1 text-xs text-gray-400 hover:text-gray-700 active:cursor-grabbing"
              >
                ⋮⋮
              </button>
            )}
            <h2 className="flex-1 text-sm font-semibold text-gray-800">{column.name}</h2>
            <span className="rounded bg-gray-200 px-1.5 text-xs text-gray-600">{tasks.length}</span>
            {onRename && (
              <button
                type="button"
                aria-label={`${column.name}を編集`}
                onClick={() => {
                  setName(column.name);
                  setEditing(true);
                }}
                className="ml-1 px-1 text-xs text-gray-400 opacity-0 hover:text-gray-700 group-hover:opacity-100"
              >
                ✎
              </button>
            )}
            {onRequestDelete && (
              <button
                type="button"
                aria-label={`${column.name}を削除`}
                onClick={() => onRequestDelete(column)}
                className="px-1 text-xs text-gray-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
              >
                ✕
              </button>
            )}
          </>
        )}
      </header>
      <div ref={setDroppableRef} className="flex min-h-[2rem] flex-col gap-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onClick={onTaskClick} draggable={draggable} />
          ))}
        </SortableContext>
      </div>

      {onAddTask && (
        <div className="mt-2">
          {adding ? (
            <input
              autoFocus
              value={newTitle}
              placeholder="タスク名"
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const title = newTitle.trim();
                  if (title.length > 0) {
                    onAddTask(column.id, title);
                  }
                  setNewTitle("");
                  setAdding(false);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setNewTitle("");
                  setAdding(false);
                }
              }}
              onBlur={() => {
                const title = newTitle.trim();
                if (title.length > 0) {
                  onAddTask(column.id, title);
                }
                setNewTitle("");
                setAdding(false);
              }}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-gray-500"
            />
          ) : (
            <button
              type="button"
              aria-label={`${column.name}にタスクを追加`}
              onClick={() => {
                setNewTitle("");
                setAdding(true);
              }}
              className="w-full rounded border border-dashed border-gray-300 bg-white/50 px-2 py-1 text-xs text-gray-500 hover:bg-white"
            >
              ＋ タスク追加
            </button>
          )}
        </div>
      )}
    </section>
  );
}
