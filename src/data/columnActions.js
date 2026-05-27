import { createColumn, deleteColumn, moveTasksToColumn, renameColumn, reorderColumns, } from "@/db/columns";
import { updateDoneColumn } from "@/db/projects";
import { useBoardStore } from "@/store/boardStore";
export async function createColumnAction(db, projectId, name) {
    const column = await createColumn(db, projectId, name);
    useBoardStore.getState().upsertColumn(column);
    return column;
}
export async function renameColumnAction(db, id, name) {
    await renameColumn(db, id, name);
    const store = useBoardStore.getState();
    const target = store.columns.find((c) => c.id === id);
    if (!target)
        return;
    store.upsertColumn({ ...target, name: name.trim() });
}
async function clearDoneColumnIfNeeded(db, columnId) {
    const store = useBoardStore.getState();
    const project = store.projects.find((p) => p.doneColumnId === columnId);
    if (!project)
        return;
    await updateDoneColumn(db, project.id, null);
    store.upsertProject({ ...project, doneColumnId: null });
}
export async function deleteColumnCascadeAction(db, id) {
    await clearDoneColumnIfNeeded(db, id);
    await deleteColumn(db, id);
    useBoardStore.getState().removeColumn(id);
}
export async function deleteColumnAfterMoveAction(db, fromColumnId, toColumnId) {
    await clearDoneColumnIfNeeded(db, fromColumnId);
    await moveTasksToColumn(db, fromColumnId, toColumnId);
    await deleteColumn(db, fromColumnId);
    // store: 移動対象タスクのcolumnIdを書き換え、その後、空になった列を削除
    useBoardStore.setState((s) => ({
        tasks: s.tasks.map((t) => t.columnId === fromColumnId ? { ...t, columnId: toColumnId } : t),
    }));
    useBoardStore.getState().removeColumn(fromColumnId);
}
export async function reorderColumnsAction(db, projectId, orderedIds) {
    await reorderColumns(db, projectId, orderedIds);
    useBoardStore.getState().reorderColumns(orderedIds);
}
export function countTasksInColumn(columnId) {
    return useBoardStore.getState().tasks.filter((t) => t.columnId === columnId).length;
}
