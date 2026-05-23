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
  await db.execute(
    "INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
    [id, trimmed, ts, ts],
  );
  return { id, name: trimmed, createdAt: ts, updatedAt: ts };
}

export async function listProjects(db: Db): Promise<Project[]> {
  const rows = await db.select<ProjectRow[]>(
    "SELECT id, name, created_at, updated_at FROM projects ORDER BY created_at ASC",
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

export async function deleteProject(db: Db, id: string): Promise<void> {
  await db.execute("DELETE FROM projects WHERE id = ?", [id]);
}
