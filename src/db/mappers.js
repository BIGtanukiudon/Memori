import { parsePriority } from "@/lib/priority";
export function rowToProject(r) {
    return {
        id: r.id,
        name: r.name,
        position: r.position,
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
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
