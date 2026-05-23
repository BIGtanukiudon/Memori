import type { Column, Project, Task } from "@/types/domain";
import type { BoardState } from "./boardStore";

type BoardSlice = Pick<BoardState, "projects" | "currentProjectId" | "columns" | "tasks">;

export function selectCurrentProject(s: BoardSlice): Project | null {
  if (!s.currentProjectId) return null;
  return s.projects.find((p) => p.id === s.currentProjectId) ?? null;
}

export function selectSortedColumns(s: BoardSlice): Column[] {
  return [...s.columns].sort((a, b) => a.position - b.position);
}

export function selectTasksByColumn(s: BoardSlice): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const t of s.tasks) {
    const list = map.get(t.columnId) ?? [];
    list.push(t);
    map.set(t.columnId, list);
  }
  for (const [k, v] of map) {
    map.set(
      k,
      [...v].sort((a, b) => a.position - b.position),
    );
  }
  return map;
}
