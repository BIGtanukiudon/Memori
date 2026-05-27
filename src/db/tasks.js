import { newId } from "@/lib/id";
import { Priority } from "@/lib/priority";
import { rowToTask } from "./mappers";
function nowIso() {
    return new Date().toISOString();
}
async function nextTaskPosition(db, columnId) {
    const rows = await db.select("SELECT COALESCE(MAX(position) + 1, 0) AS next FROM tasks WHERE column_id = ?", [columnId]);
    return rows[0]?.next ?? 0;
}
export async function createTask(db, input) {
    const title = input.title.trim();
    if (title.length === 0)
        throw new Error("タイトルは必須です");
    const id = newId();
    const ts = nowIso();
    const memo = input.memo ?? null;
    const dueDate = input.dueDate ?? null;
    const priority = input.priority ?? Priority.None;
    const position = await nextTaskPosition(db, input.columnId);
    await db.execute(`INSERT INTO tasks (
      id, project_id, column_id, title, memo, due_date, priority, position, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, input.projectId, input.columnId, title, memo, dueDate, priority, position, ts, ts]);
    return {
        id,
        projectId: input.projectId,
        columnId: input.columnId,
        title,
        memo,
        dueDate,
        priority,
        position,
        completedAt: null,
        createdAt: ts,
        updatedAt: ts,
    };
}
const TASK_SELECT_COLS = "id, project_id, column_id, title, memo, due_date, priority, position, completed_at, created_at, updated_at";
export async function listTasks(db) {
    const rows = await db.select(`SELECT ${TASK_SELECT_COLS} FROM tasks ORDER BY column_id, position ASC`);
    return rows.map(rowToTask);
}
export async function listTasksByProject(db, projectId) {
    const rows = await db.select(`SELECT ${TASK_SELECT_COLS} FROM tasks WHERE project_id = ? ORDER BY column_id, position ASC`, [projectId]);
    return rows.map(rowToTask);
}
export async function listTasksByColumn(db, columnId) {
    const rows = await db.select(`SELECT ${TASK_SELECT_COLS} FROM tasks WHERE column_id = ? ORDER BY position ASC`, [columnId]);
    return rows.map(rowToTask);
}
export async function updateTask(db, id, patch) {
    const sets = [];
    const params = [];
    if (patch.title !== undefined) {
        const title = patch.title.trim();
        if (title.length === 0)
            throw new Error("タイトルは必須です");
        sets.push("title = ?");
        params.push(title);
    }
    if (patch.memo !== undefined) {
        sets.push("memo = ?");
        params.push(patch.memo);
    }
    if (patch.dueDate !== undefined) {
        sets.push("due_date = ?");
        params.push(patch.dueDate);
    }
    if (patch.priority !== undefined) {
        sets.push("priority = ?");
        params.push(patch.priority);
    }
    if (sets.length === 0)
        return;
    sets.push("updated_at = ?");
    params.push(nowIso());
    params.push(id);
    await db.execute(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, params);
}
export async function updateTaskColumn(db, id, columnId, completedAt) {
    if (completedAt !== undefined) {
        await db.execute("UPDATE tasks SET column_id = ?, completed_at = ?, updated_at = ? WHERE id = ?", [columnId, completedAt, nowIso(), id]);
    }
    else {
        await db.execute("UPDATE tasks SET column_id = ?, updated_at = ? WHERE id = ?", [
            columnId,
            nowIso(),
            id,
        ]);
    }
}
export async function reorderTasks(db, _columnId, orderedIds) {
    for (let i = 0; i < orderedIds.length; i++) {
        await db.execute("UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?", [i, nowIso(), orderedIds[i]]);
    }
}
export async function deleteTask(db, id) {
    await db.execute("DELETE FROM tasks WHERE id = ?", [id]);
}
