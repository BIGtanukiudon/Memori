import { emit, listen } from "@tauri-apps/api/event";
import { isTauriRuntime } from "./window";
export const EVENT_NAMES = {
    taskCreated: "task:created",
    taskUpdated: "task:updated",
    taskDeleted: "task:deleted",
    projectChanged: "project:changed",
};
const NOOP_UNLISTEN = () => { };
function safeEmit(name, payload) {
    if (!isTauriRuntime())
        return Promise.resolve();
    return emit(name, payload);
}
function safeListen(name, cb) {
    if (!isTauriRuntime())
        return Promise.resolve(NOOP_UNLISTEN);
    return listen(name, (e) => cb(e.payload));
}
export function emitTaskCreated(p) {
    return safeEmit(EVENT_NAMES.taskCreated, p);
}
export function emitTaskUpdated(p) {
    return safeEmit(EVENT_NAMES.taskUpdated, p);
}
export function emitTaskDeleted(p) {
    return safeEmit(EVENT_NAMES.taskDeleted, p);
}
export function emitProjectChanged(p) {
    return safeEmit(EVENT_NAMES.projectChanged, p);
}
export function listenTaskCreated(cb) {
    return safeListen(EVENT_NAMES.taskCreated, cb);
}
export function listenTaskUpdated(cb) {
    return safeListen(EVENT_NAMES.taskUpdated, cb);
}
export function listenTaskDeleted(cb) {
    return safeListen(EVENT_NAMES.taskDeleted, cb);
}
export function listenProjectChanged(cb) {
    return safeListen(EVENT_NAMES.projectChanged, cb);
}
