import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
const emitMock = vi.fn();
const listenMock = vi.fn();
vi.mock("@tauri-apps/api/event", () => ({
    emit: (...a) => emitMock(...a),
    listen: (...a) => listenMock(...a),
}));
beforeEach(() => {
    window.__TAURI_INTERNALS__ = {};
});
afterEach(() => {
    delete window.__TAURI_INTERNALS__;
});
import { emitTaskCreated, emitTaskUpdated, emitTaskDeleted, emitProjectChanged, emitWorkLogAdded, listenTaskCreated, listenTaskUpdated, listenTaskDeleted, listenProjectChanged, listenWorkLogAdded, listenQuickModeChanged, EVENT_NAMES, } from "./events";
beforeEach(() => {
    emitMock.mockReset();
    listenMock.mockReset().mockResolvedValue(() => { });
});
describe("emit", () => {
    it("emitTaskCreated は task:created を emit する", async () => {
        await emitTaskCreated({ taskId: "T1", projectId: "P1" });
        expect(emitMock).toHaveBeenCalledWith(EVENT_NAMES.taskCreated, {
            taskId: "T1",
            projectId: "P1",
        });
    });
    it("emitTaskUpdated は task:updated を emit する", async () => {
        await emitTaskUpdated({ taskId: "T1", projectId: "P1" });
        expect(emitMock).toHaveBeenCalledWith(EVENT_NAMES.taskUpdated, {
            taskId: "T1",
            projectId: "P1",
        });
    });
    it("emitTaskDeleted は task:deleted を emit する", async () => {
        await emitTaskDeleted({ taskId: "T1", projectId: "P1" });
        expect(emitMock).toHaveBeenCalledWith(EVENT_NAMES.taskDeleted, {
            taskId: "T1",
            projectId: "P1",
        });
    });
    it("emitProjectChanged は project:changed を emit する", async () => {
        await emitProjectChanged({ projectId: "P1" });
        expect(emitMock).toHaveBeenCalledWith(EVENT_NAMES.projectChanged, {
            projectId: "P1",
        });
    });
    it("emitWorkLogAdded は worklog:added を emit する", async () => {
        await emitWorkLogAdded({ taskId: "T1", projectId: "P1" });
        expect(emitMock).toHaveBeenCalledWith(EVENT_NAMES.workLogAdded, {
            taskId: "T1",
            projectId: "P1",
        });
    });
});
describe("listen", () => {
    it("listenTaskCreated は task:created を listen する", async () => {
        const cb = vi.fn();
        await listenTaskCreated(cb);
        expect(listenMock).toHaveBeenCalledWith(EVENT_NAMES.taskCreated, expect.any(Function));
    });
    it("listenTaskUpdated", async () => {
        await listenTaskUpdated(vi.fn());
        expect(listenMock).toHaveBeenCalledWith(EVENT_NAMES.taskUpdated, expect.any(Function));
    });
    it("listenTaskDeleted", async () => {
        await listenTaskDeleted(vi.fn());
        expect(listenMock).toHaveBeenCalledWith(EVENT_NAMES.taskDeleted, expect.any(Function));
    });
    it("listenProjectChanged", async () => {
        await listenProjectChanged(vi.fn());
        expect(listenMock).toHaveBeenCalledWith(EVENT_NAMES.projectChanged, expect.any(Function));
    });
    it("listenWorkLogAdded", async () => {
        await listenWorkLogAdded(vi.fn());
        expect(listenMock).toHaveBeenCalledWith(EVENT_NAMES.workLogAdded, expect.any(Function));
    });
    it("listenQuickModeChanged", async () => {
        await listenQuickModeChanged(vi.fn());
        expect(listenMock).toHaveBeenCalledWith(EVENT_NAMES.quickModeChanged, expect.any(Function));
    });
    it("listener はペイロードを受け取る", async () => {
        const cb = vi.fn();
        listenMock.mockImplementationOnce(async (_name, handler) => {
            handler({ payload: { taskId: "T1", projectId: "P1" } });
            return () => { };
        });
        await listenTaskCreated(cb);
        expect(cb).toHaveBeenCalledWith({ taskId: "T1", projectId: "P1" });
    });
});
