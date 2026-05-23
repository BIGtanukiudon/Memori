import type { Db } from "@/db/types";
import {
  createTask,
  deleteTask,
  reorderTasks,
  updateTask,
  updateTaskColumn,
  type CreateTaskInput,
  type UpdateTaskPatch,
} from "@/db/tasks";
import type { Task } from "@/types/domain";
import { useBoardStore } from "@/store/boardStore";

export async function createTaskAction(db: Db, input: CreateTaskInput): Promise<Task> {
  const task = await createTask(db, input);
  useBoardStore.getState().upsertTask(task);
  return task;
}

export async function updateTaskAction(
  db: Db,
  id: string,
  patch: UpdateTaskPatch,
): Promise<void> {
  await updateTask(db, id, patch);
  const store = useBoardStore.getState();
  const target = store.tasks.find((t) => t.id === id);
  if (!target) return;
  const updated: Task = {
    ...target,
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.memo !== undefined ? { memo: patch.memo } : {}),
    ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    updatedAt: new Date().toISOString(),
  };
  store.upsertTask(updated);
}

export async function deleteTaskAction(db: Db, id: string): Promise<void> {
  await deleteTask(db, id);
  useBoardStore.getState().removeTask(id);
}

export interface MoveTaskInput {
  taskId: string;
  toColumnId: string;
  toIndex: number;
}

export async function moveTaskAction(db: Db, input: MoveTaskInput): Promise<void> {
  const store = useBoardStore.getState();
  const task = store.tasks.find((t) => t.id === input.taskId);
  if (!task) return;
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

  // 2) store更新
  if (sameColumn) {
    store.reorderTasksInColumn(input.toColumnId, newDestIds);
  } else {
    const newSource = store.tasks
      .filter((t) => t.columnId === fromColumnId && t.id !== input.taskId)
      .sort((a, b) => a.position - b.position)
      .map((t) => t.id);
    store.moveTaskAcrossColumns(input.taskId, input.toColumnId, newSource, newDestIds);
  }

  // 3) DB永続化
  if (!sameColumn) {
    await updateTaskColumn(db, input.taskId, input.toColumnId);
    const newSourceIds = useBoardStore
      .getState()
      .tasks.filter((t) => t.columnId === fromColumnId)
      .sort((a, b) => a.position - b.position)
      .map((t) => t.id);
    await reorderTasks(db, fromColumnId, newSourceIds);
  }
  await reorderTasks(db, input.toColumnId, newDestIds);
}
