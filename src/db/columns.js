import { newId } from "@/lib/id";
import { rowToColumn } from "./mappers";
function nowIso() {
    return new Date().toISOString();
}
function requireName(raw) {
    const name = raw.trim();
    if (name.length === 0)
        throw new Error("列名は必須です");
    return name;
}
async function nextColumnPosition(db, projectId) {
    const rows = await db.select("SELECT COALESCE(MAX(position) + 1, 0) AS next FROM columns WHERE project_id = ?", [projectId]);
    return rows[0]?.next ?? 0;
}
export async function createColumn(db, projectId, name) {
    const trimmed = requireName(name);
    const id = newId();
    const position = await nextColumnPosition(db, projectId);
    await db.execute("INSERT INTO columns (id, project_id, name, position) VALUES (?, ?, ?, ?)", [id, projectId, trimmed, position]);
    return { id, projectId, name: trimmed, position };
}
export async function listColumns(db, projectId) {
    const rows = await db.select("SELECT id, project_id, name, position FROM columns WHERE project_id = ? ORDER BY position ASC", [projectId]);
    return rows.map(rowToColumn);
}
export async function listAllColumns(db) {
    const rows = await db.select("SELECT id, project_id, name, position FROM columns ORDER BY project_id, position ASC");
    return rows.map(rowToColumn);
}
export async function renameColumn(db, id, name) {
    const trimmed = requireName(name);
    await db.execute("UPDATE columns SET name = ? WHERE id = ?", [trimmed, id]);
}
export async function reorderColumns(db, _projectId, orderedIds) {
    for (let i = 0; i < orderedIds.length; i++) {
        await db.execute("UPDATE columns SET position = ? WHERE id = ?", [i, orderedIds[i]]);
    }
}
export async function deleteColumn(db, id) {
    await db.execute("DELETE FROM columns WHERE id = ?", [id]);
}
export async function moveTasksToColumn(db, fromColumnId, toColumnId) {
    const baseRows = await db.select("SELECT COALESCE(MAX(position) + 1, 0) AS next FROM tasks WHERE column_id = ?", [toColumnId]);
    const base = baseRows[0]?.next ?? 0;
    const taskRows = await db.select("SELECT id FROM tasks WHERE column_id = ? ORDER BY position ASC", [fromColumnId]);
    for (let i = 0; i < taskRows.length; i++) {
        const ts = nowIso();
        await db.execute("UPDATE tasks SET column_id = ?, position = ?, updated_at = ? WHERE id = ?", [toColumnId, base + i, ts, taskRows[i].id]);
    }
}
