import type { Column } from "@/types/domain";
import { newId } from "@/lib/id";
import { rowToColumn, type ColumnRow } from "./mappers";
import type { Db } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function requireName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0) throw new Error("列名は必須です");
  return name;
}

async function nextColumnPosition(db: Db, projectId: string): Promise<number> {
  const rows = await db.select<{ next: number | null }[]>(
    "SELECT COALESCE(MAX(position) + 1, 0) AS next FROM columns WHERE project_id = ?",
    [projectId],
  );
  return rows[0]?.next ?? 0;
}

export async function createColumn(db: Db, projectId: string, name: string): Promise<Column> {
  const trimmed = requireName(name);
  const id = newId();
  const position = await nextColumnPosition(db, projectId);
  await db.execute(
    "INSERT INTO columns (id, project_id, name, position) VALUES (?, ?, ?, ?)",
    [id, projectId, trimmed, position],
  );
  return { id, projectId, name: trimmed, position };
}

export async function listColumns(db: Db, projectId: string): Promise<Column[]> {
  const rows = await db.select<ColumnRow[]>(
    "SELECT id, project_id, name, position FROM columns WHERE project_id = ? ORDER BY position ASC",
    [projectId],
  );
  return rows.map(rowToColumn);
}

export async function listAllColumns(db: Db): Promise<Column[]> {
  const rows = await db.select<ColumnRow[]>(
    "SELECT id, project_id, name, position FROM columns ORDER BY project_id, position ASC",
  );
  return rows.map(rowToColumn);
}

export async function renameColumn(db: Db, id: string, name: string): Promise<void> {
  const trimmed = requireName(name);
  await db.execute("UPDATE columns SET name = ? WHERE id = ?", [trimmed, id]);
}

export async function reorderColumns(
  db: Db,
  _projectId: string,
  orderedIds: readonly string[],
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.execute("UPDATE columns SET position = ? WHERE id = ?", [i, orderedIds[i]!]);
  }
}

export async function deleteColumn(db: Db, id: string): Promise<void> {
  await db.execute("DELETE FROM columns WHERE id = ?", [id]);
}

export async function moveTasksToColumn(
  db: Db,
  fromColumnId: string,
  toColumnId: string,
): Promise<void> {
  const baseRows = await db.select<{ next: number | null }[]>(
    "SELECT COALESCE(MAX(position) + 1, 0) AS next FROM tasks WHERE column_id = ?",
    [toColumnId],
  );
  const base = baseRows[0]?.next ?? 0;

  const taskRows = await db.select<{ id: string }[]>(
    "SELECT id FROM tasks WHERE column_id = ? ORDER BY position ASC",
    [fromColumnId],
  );

  for (let i = 0; i < taskRows.length; i++) {
    const ts = nowIso();
    await db.execute(
      "UPDATE tasks SET column_id = ?, position = ?, updated_at = ? WHERE id = ?",
      [toColumnId, base + i, ts, taskRows[i]!.id],
    );
  }
}
