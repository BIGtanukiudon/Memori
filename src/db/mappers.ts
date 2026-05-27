import type { Column, Project, Task } from "@/types/domain";
import { parsePriority } from "@/lib/priority";

export interface ProjectRow {
  id: string;
  name: string;
  position: number;
  done_column_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ColumnRow {
  id: string;
  project_id: string;
  name: string;
  position: number;
}

export interface TaskRow {
  id: string;
  project_id: string;
  column_id: string;
  title: string;
  memo: string | null;
  due_date: string | null;
  priority: number;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToProject(r: ProjectRow): Project {
  return {
    id: r.id,
    name: r.name,
    position: r.position,
    doneColumnId: r.done_column_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToColumn(r: ColumnRow): Column {
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    position: r.position,
  };
}

export function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    projectId: r.project_id,
    columnId: r.column_id,
    title: r.title,
    memo: r.memo,
    dueDate: r.due_date,
    priority: parsePriority(r.priority),
    position: r.position,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
