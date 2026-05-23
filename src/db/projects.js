import { newId } from "@/lib/id";
import { rowToProject } from "./mappers";
function nowIso() {
    return new Date().toISOString();
}
function requireName(raw) {
    const name = raw.trim();
    if (name.length === 0) {
        throw new Error("プロジェクト名は必須です");
    }
    return name;
}
export async function createProject(db, name) {
    const trimmed = requireName(name);
    const id = newId();
    const ts = nowIso();
    await db.execute("INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)", [id, trimmed, ts, ts]);
    return { id, name: trimmed, createdAt: ts, updatedAt: ts };
}
export async function listProjects(db) {
    const rows = await db.select("SELECT id, name, created_at, updated_at FROM projects ORDER BY created_at ASC");
    return rows.map(rowToProject);
}
export async function renameProject(db, id, name) {
    const trimmed = requireName(name);
    const ts = nowIso();
    await db.execute("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?", [
        trimmed,
        ts,
        id,
    ]);
}
export async function deleteProject(db, id) {
    await db.execute("DELETE FROM projects WHERE id = ?", [id]);
}
