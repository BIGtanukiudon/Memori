import { newId } from "@/lib/id";
import { rowToWorkLog } from "./mappers";
function nowIso() {
    return new Date().toISOString();
}
function requireBody(raw) {
    const body = raw.trim();
    if (body.length === 0) {
        throw new Error("本文は必須です");
    }
    return body;
}
export async function createWorkLog(db, input) {
    const body = requireBody(input.body);
    const rows = await db.select(`SELECT t.project_id AS project_id, t.title AS task_title, p.name AS project_name
     FROM tasks t JOIN projects p ON p.id = t.project_id
     WHERE t.id = ?`, [input.taskId]);
    const task = rows[0];
    if (!task)
        throw new Error("タスクが見つかりません");
    const id = newId();
    const ts = nowIso();
    await db.execute(`INSERT INTO work_logs (
      id, task_id, project_id, body, task_title, project_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, input.taskId, task.project_id, body, task.task_title, task.project_name, ts, ts]);
    return {
        id,
        taskId: input.taskId,
        projectId: task.project_id,
        body,
        taskTitle: task.task_title,
        projectName: task.project_name,
        createdAt: ts,
        updatedAt: ts,
    };
}
export async function listWorkLogsByTask(db, taskId) {
    const rows = await db.select(`SELECT id, task_id, project_id, body, task_title, project_name, created_at, updated_at
     FROM work_logs WHERE task_id = ? ORDER BY created_at DESC`, [taskId]);
    return rows.map(rowToWorkLog);
}
export async function updateWorkLog(db, id, body) {
    const trimmed = requireBody(body);
    const ts = nowIso();
    await db.execute("UPDATE work_logs SET body = ?, updated_at = ? WHERE id = ?", [
        trimmed,
        ts,
        id,
    ]);
}
export async function deleteWorkLog(db, id) {
    await db.execute("DELETE FROM work_logs WHERE id = ?", [id]);
}
// 直近ログの対象タスクID。tasksへ内部結合することで、削除済みタスクを指すログは
// 自然に除外され、現存するタスクを指す最新のログが見つかるまで遡る（ADR-0002）。
export async function getLastLoggedTaskId(db) {
    const rows = await db.select(`SELECT wl.task_id AS task_id
     FROM work_logs wl
     JOIN tasks t ON t.id = wl.task_id
     ORDER BY wl.created_at DESC
     LIMIT 1`);
    return rows[0]?.task_id ?? null;
}
