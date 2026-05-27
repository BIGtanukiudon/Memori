import type { Project } from "@/types/domain";
import { newId } from "@/lib/id";
import { rowToProject, type ProjectRow } from "./mappers";
import type { Db } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function requireName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0) {
    throw new Error("プロジェクト名は必須です");
  }
  return name;
}

export async function createProject(db: Db, name: string): Promise<Project> {
  const trimmed = requireName(name);
  const id = newId();
  const ts = nowIso();
  const rows = await db.select<{ next: number }[]>(
    "SELECT COALESCE(MAX(position), -1) + 1 AS next FROM projects",
  );
  const position = rows[0]?.next ?? 0;
  await db.execute(
    "INSERT INTO projects (id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [id, trimmed, position, ts, ts],
  );
  return { id, name: trimmed, position, doneColumnId: null, createdAt: ts, updatedAt: ts };
}

export async function listProjects(db: Db): Promise<Project[]> {
  const rows = await db.select<ProjectRow[]>(
    "SELECT id, name, position, done_column_id, created_at, updated_at FROM projects ORDER BY position ASC",
  );
  return rows.map(rowToProject);
}

export async function renameProject(db: Db, id: string, name: string): Promise<void> {
  const trimmed = requireName(name);
  const ts = nowIso();
  await db.execute("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?", [
    trimmed,
    ts,
    id,
  ]);
}

export async function reorderProjects(db: Db, orderedIds: readonly string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.execute("UPDATE projects SET position = ? WHERE id = ?", [i, orderedIds[i]]);
  }
}

export async function updateDoneColumn(
  db: Db,
  projectId: string,
  columnId: string | null,
): Promise<void> {
  await db.execute("UPDATE projects SET done_column_id = ? WHERE id = ?", [columnId, projectId]);
}

export async function deleteProject(db: Db, id: string): Promise<void> {
  await db.execute("DELETE FROM projects WHERE id = ?", [id]);
}
