import type { Db } from "@/db/types";
import {
  createColumn,
  deleteColumn,
  moveTasksToColumn,
  renameColumn,
  reorderColumns,
} from "@/db/columns";
import type { Column } from "@/types/domain";
import { useBoardStore } from "@/store/boardStore";

export async function createColumnAction(
  db: Db,
  projectId: string,
  name: string,
): Promise<Column> {
  const column = await createColumn(db, projectId, name);
  useBoardStore.getState().upsertColumn(column);
  return column;
}

export async function renameColumnAction(
  db: Db,
  id: string,
  name: string,
): Promise<void> {
  await renameColumn(db, id, name);
  const store = useBoardStore.getState();
  const target = store.columns.find((c) => c.id === id);
  if (!target) return;
  store.upsertColumn({ ...target, name: name.trim() });
}

export async function deleteColumnCascadeAction(db: Db, id: string): Promise<void> {
  await deleteColumn(db, id);
  useBoardStore.getState().removeColumn(id);
}

export async function deleteColumnAfterMoveAction(
  db: Db,
  fromColumnId: string,
  toColumnId: string,
): Promise<void> {
  await moveTasksToColumn(db, fromColumnId, toColumnId);
  await deleteColumn(db, fromColumnId);

  // store: 移動対象タスクのcolumnIdを書き換え、その後、空になった列を削除
  useBoardStore.setState((s) => ({
    tasks: s.tasks.map((t) =>
      t.columnId === fromColumnId ? { ...t, columnId: toColumnId } : t,
    ),
  }));
  useBoardStore.getState().removeColumn(fromColumnId);
}

export async function reorderColumnsAction(
  db: Db,
  projectId: string,
  orderedIds: readonly string[],
): Promise<void> {
  await reorderColumns(db, projectId, orderedIds);
  useBoardStore.getState().reorderColumns(orderedIds);
}

export function countTasksInColumn(columnId: string): number {
  return useBoardStore.getState().tasks.filter((t) => t.columnId === columnId).length;
}
