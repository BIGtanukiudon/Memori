import { create } from "zustand";
import type { Column, Project, Task } from "@/types/domain";

export interface BoardState {
  projects: Project[];
  currentProjectId: string | null;
  columns: Column[];
  tasks: Task[];

  reset: () => void;

  setProjects: (projects: Project[]) => void;
  setCurrentProject: (id: string | null) => void;
  setColumns: (columns: Column[]) => void;
  setTasks: (tasks: Task[]) => void;

  upsertProject: (p: Project) => void;
  removeProject: (id: string) => void;
  reorderProjects: (orderedIds: readonly string[]) => void;

  upsertColumn: (c: Column) => void;
  removeColumn: (id: string) => void;
  reorderColumns: (orderedIds: readonly string[]) => void;

  upsertTask: (t: Task) => void;
  removeTask: (id: string) => void;
  reorderTasksInColumn: (columnId: string, orderedIds: readonly string[]) => void;
  moveTaskAcrossColumns: (
    taskId: string,
    toColumnId: string,
    sourceOrderedIds: readonly string[],
    destOrderedIds: readonly string[],
  ) => void;
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...list, item];
  const next = [...list];
  next[idx] = item;
  return next;
}

function renumberByOrder<T extends { id: string; position: number }>(
  list: T[],
  orderedIds: readonly string[],
): T[] {
  const byId = new Map(list.map((x) => [x.id, x]));
  return list.map((x) => {
    const newPos = orderedIds.indexOf(x.id);
    if (newPos === -1) return x;
    return { ...byId.get(x.id)!, position: newPos };
  });
}

export const useBoardStore = create<BoardState>((set) => ({
  projects: [],
  currentProjectId: null,
  columns: [],
  tasks: [],

  reset: () => set({ projects: [], currentProjectId: null, columns: [], tasks: [] }),

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (id) => set({ currentProjectId: id }),
  setColumns: (columns) => set({ columns }),
  setTasks: (tasks) => set({ tasks }),

  upsertProject: (p) => set((s) => ({ projects: upsertById(s.projects, p) })),
  removeProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
    })),
  reorderProjects: (orderedIds) =>
    set((s) => ({ projects: renumberByOrder(s.projects, orderedIds) })),

  upsertColumn: (c) => set((s) => ({ columns: upsertById(s.columns, c) })),
  removeColumn: (id) =>
    set((s) => ({
      columns: s.columns.filter((c) => c.id !== id),
      tasks: s.tasks.filter((t) => t.columnId !== id),
    })),
  reorderColumns: (orderedIds) =>
    set((s) => ({ columns: renumberByOrder(s.columns, orderedIds) })),

  upsertTask: (t) => set((s) => ({ tasks: upsertById(s.tasks, t) })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  reorderTasksInColumn: (columnId, orderedIds) =>
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.columnId !== columnId) return t;
        const pos = orderedIds.indexOf(t.id);
        return pos === -1 ? t : { ...t, position: pos };
      }),
    })),
  moveTaskAcrossColumns: (taskId, toColumnId, sourceOrderedIds, destOrderedIds) =>
    set((s) => ({
      tasks: s.tasks.map((t) => {
        // 移動するタスク自身: columnIdを変えてdest側のpositionへ
        if (t.id === taskId) {
          const newPos = destOrderedIds.indexOf(t.id);
          return { ...t, columnId: toColumnId, position: newPos === -1 ? t.position : newPos };
        }
        // dest列のタスク（移動対象以外）
        const destPos = destOrderedIds.indexOf(t.id);
        if (destPos !== -1 && t.columnId === toColumnId) {
          return { ...t, position: destPos };
        }
        // source列のタスク
        const srcPos = sourceOrderedIds.indexOf(t.id);
        if (srcPos !== -1) {
          return { ...t, position: srcPos };
        }
        return t;
      }),
    })),
}));
