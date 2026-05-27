import { createTask, deleteTask, reorderTasks, updateTask, updateTaskColumn, } from "@/db/tasks";
import { useBoardStore } from "@/store/boardStore";
export async function createTaskAction(db, input) {
    const task = await createTask(db, input);
    useBoardStore.getState().upsertTask(task);
    return task;
}
export async function updateTaskAction(db, id, patch) {
    await updateTask(db, id, patch);
    const store = useBoardStore.getState();
    const target = store.tasks.find((t) => t.id === id);
    if (!target)
        return;
    const updated = {
        ...target,
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.memo !== undefined ? { memo: patch.memo } : {}),
        ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        updatedAt: new Date().toISOString(),
    };
    store.upsertTask(updated);
}
export async function deleteTaskAction(db, id) {
    await deleteTask(db, id);
    useBoardStore.getState().removeTask(id);
}
export async function moveTaskAction(db, input) {
    const store = useBoardStore.getState();
    const task = store.tasks.find((t) => t.id === input.taskId);
    if (!task)
        return;
    const fromColumnId = task.columnId;
    const sameColumn = fromColumnId === input.toColumnId;
    // 1) 現在のstoreから新しい順序を計算
    const destTasks = store.tasks
        .filter((t) => t.columnId === input.toColumnId && t.id !== input.taskId)
        .sort((a, b) => a.position - b.position);
    const newDest = [...destTasks];
    const insertAt = Math.max(0, Math.min(input.toIndex, newDest.length));
    newDest.splice(insertAt, 0, task);
    const newDestIds = newDest.map((t) => t.id);
    // 2) completedAt の判定
    const project = store.projects.find((p) => p.id === task.projectId);
    const doneColumnId = project?.doneColumnId ?? null;
    let completedAt;
    if (!sameColumn && doneColumnId) {
        if (input.toColumnId === doneColumnId) {
            completedAt = new Date().toISOString();
        }
        else if (fromColumnId === doneColumnId) {
            completedAt = null;
        }
    }
    // 3) store更新
    if (sameColumn) {
        store.reorderTasksInColumn(input.toColumnId, newDestIds);
    }
    else {
        const newSource = store.tasks
            .filter((t) => t.columnId === fromColumnId && t.id !== input.taskId)
            .sort((a, b) => a.position - b.position)
            .map((t) => t.id);
        store.moveTaskAcrossColumns(input.taskId, input.toColumnId, newSource, newDestIds);
        if (completedAt !== undefined) {
            useBoardStore.setState((s) => ({
                tasks: s.tasks.map((t) => t.id === input.taskId ? { ...t, completedAt } : t),
            }));
        }
    }
    // 4) DB永続化
    if (!sameColumn) {
        await updateTaskColumn(db, input.taskId, input.toColumnId, completedAt);
        const newSourceIds = useBoardStore
            .getState()
            .tasks.filter((t) => t.columnId === fromColumnId)
            .sort((a, b) => a.position - b.position)
            .map((t) => t.id);
        await reorderTasks(db, fromColumnId, newSourceIds);
    }
    await reorderTasks(db, input.toColumnId, newDestIds);
}
