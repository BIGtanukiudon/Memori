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
function rowToTaskSearchResult(r) {
    return {
        id: r.id,
        title: r.title,
        projectId: r.project_id,
        projectName: r.project_name,
        completedAt: r.completed_at,
    };
}
const TASK_SEARCH_FOR_LOG_LIMIT = 20;
// クイックログウィンドウの対象タスク検索。全プロジェクト横断、削除済みタスクは
// tasksに存在しないため自動的に除外される。完了タスクも候補に含めるが、
// 並びは未完了を先・完了を後ろにする。queryが空なら直近ログ順で返す。
export async function searchTasksForLog(db, query) {
    const trimmed = query.trim();
    const params = [];
    let where = "";
    if (trimmed.length > 0) {
        where = "WHERE t.title LIKE ? COLLATE NOCASE";
        params.push(`%${trimmed}%`);
    }
    const rows = await db.select(`SELECT t.id AS id, t.title AS title, t.project_id AS project_id,
            p.name AS project_name, t.completed_at AS completed_at
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     LEFT JOIN (
       SELECT task_id, MAX(created_at) AS last_logged_at FROM work_logs GROUP BY task_id
     ) wl ON wl.task_id = t.id
     ${where}
     ORDER BY (t.completed_at IS NOT NULL) ASC, wl.last_logged_at DESC, t.created_at DESC
     LIMIT ${TASK_SEARCH_FOR_LOG_LIMIT}`, params);
    return rows.map(rowToTaskSearchResult);
}
