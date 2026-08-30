import { parsePriority } from "@/lib/priority";
export function rowToProject(r) {
    return {
        id: r.id,
        name: r.name,
        position: r.position,
        doneColumnId: r.done_column_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
export function rowToColumn(r) {
    return {
        id: r.id,
        projectId: r.project_id,
        name: r.name,
        position: r.position,
    };
}
export function rowToTask(r) {
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
export function rowToWorkLog(r) {
    return {
        id: r.id,
        taskId: r.task_id,
        projectId: r.project_id,
        body: r.body,
        taskTitle: r.task_title,
        projectName: r.project_name,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
