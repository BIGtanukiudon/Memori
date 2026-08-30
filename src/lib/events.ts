import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauriRuntime } from "./window";

export const EVENT_NAMES = {
  taskCreated: "task:created",
  taskUpdated: "task:updated",
  taskDeleted: "task:deleted",
  projectChanged: "project:changed",
  workLogAdded: "worklog:added",
  quickModeChanged: "quick:mode",
} as const;

export interface TaskEventPayload {
  taskId: string;
  projectId: string;
}

export interface ProjectEventPayload {
  projectId: string;
}

export interface WorkLogEventPayload {
  taskId: string;
  projectId: string;
}

/** quick ウィンドウの表示モード。Rust側の QUICK_MODE_TASK/QUICK_MODE_LOG に対応。 */
export type QuickMode = "task" | "log";

export interface QuickModeEventPayload {
  mode: QuickMode;
}

const NOOP_UNLISTEN: UnlistenFn = () => {};

function safeEmit(name: string, payload: unknown): Promise<void> {
  if (!isTauriRuntime()) return Promise.resolve();
  return emit(name, payload);
}

function safeListen<T>(
  name: string,
  cb: (payload: T) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) return Promise.resolve(NOOP_UNLISTEN);
  return listen<T>(name, (e) => cb(e.payload));
}

export function emitTaskCreated(p: TaskEventPayload): Promise<void> {
  return safeEmit(EVENT_NAMES.taskCreated, p);
}

export function emitTaskUpdated(p: TaskEventPayload): Promise<void> {
  return safeEmit(EVENT_NAMES.taskUpdated, p);
}

export function emitTaskDeleted(p: TaskEventPayload): Promise<void> {
  return safeEmit(EVENT_NAMES.taskDeleted, p);
}

export function emitProjectChanged(p: ProjectEventPayload): Promise<void> {
  return safeEmit(EVENT_NAMES.projectChanged, p);
}

export function emitWorkLogAdded(p: WorkLogEventPayload): Promise<void> {
  return safeEmit(EVENT_NAMES.workLogAdded, p);
}

export function listenTaskCreated(
  cb: (p: TaskEventPayload) => void,
): Promise<UnlistenFn> {
  return safeListen(EVENT_NAMES.taskCreated, cb);
}

export function listenTaskUpdated(
  cb: (p: TaskEventPayload) => void,
): Promise<UnlistenFn> {
  return safeListen(EVENT_NAMES.taskUpdated, cb);
}

export function listenTaskDeleted(
  cb: (p: TaskEventPayload) => void,
): Promise<UnlistenFn> {
  return safeListen(EVENT_NAMES.taskDeleted, cb);
}

export function listenProjectChanged(
  cb: (p: ProjectEventPayload) => void,
): Promise<UnlistenFn> {
  return safeListen(EVENT_NAMES.projectChanged, cb);
}

export function listenWorkLogAdded(
  cb: (p: WorkLogEventPayload) => void,
): Promise<UnlistenFn> {
  return safeListen(EVENT_NAMES.workLogAdded, cb);
}

export function listenQuickModeChanged(
  cb: (p: QuickModeEventPayload) => void,
): Promise<UnlistenFn> {
  return safeListen(EVENT_NAMES.quickModeChanged, cb);
}
