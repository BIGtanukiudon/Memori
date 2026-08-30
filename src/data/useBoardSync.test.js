import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
const listenTaskCreated = vi.fn();
const listenTaskUpdated = vi.fn();
const listenTaskDeleted = vi.fn();
const listenProjectChanged = vi.fn();
const listenWorkLogAdded = vi.fn();
const unlistenTaskCreated = vi.fn();
const unlistenTaskUpdated = vi.fn();
const unlistenTaskDeleted = vi.fn();
const unlistenProjectChanged = vi.fn();
const unlistenWorkLogAdded = vi.fn();
vi.mock("@/lib/events", () => ({
    EVENT_NAMES: {
        taskCreated: "task:created",
        taskUpdated: "task:updated",
        taskDeleted: "task:deleted",
        projectChanged: "project:changed",
        workLogAdded: "worklog:added",
    },
    listenTaskCreated: (...a) => listenTaskCreated(...a),
    listenTaskUpdated: (...a) => listenTaskUpdated(...a),
    listenTaskDeleted: (...a) => listenTaskDeleted(...a),
    listenProjectChanged: (...a) => listenProjectChanged(...a),
    listenWorkLogAdded: (...a) => listenWorkLogAdded(...a),
}));
import { useBoardSync } from "./useBoardSync";
beforeEach(() => {
    listenTaskCreated.mockReset().mockResolvedValue(unlistenTaskCreated);
    listenTaskUpdated.mockReset().mockResolvedValue(unlistenTaskUpdated);
    listenTaskDeleted.mockReset().mockResolvedValue(unlistenTaskDeleted);
    listenProjectChanged.mockReset().mockResolvedValue(unlistenProjectChanged);
    listenWorkLogAdded.mockReset().mockResolvedValue(unlistenWorkLogAdded);
    unlistenTaskCreated.mockReset();
    unlistenTaskUpdated.mockReset();
    unlistenTaskDeleted.mockReset();
    unlistenProjectChanged.mockReset();
    unlistenWorkLogAdded.mockReset();
});
describe("useBoardSync", () => {
    it("マウント時に4つの listener を登録する", async () => {
        const onTaskEvent = vi.fn();
        const onProjectChanged = vi.fn();
        renderHook(() => useBoardSync({ onTaskEvent, onProjectChanged }));
        // listenはasyncなので、microtaskを待つ
        await Promise.resolve();
        expect(listenTaskCreated).toHaveBeenCalled();
        expect(listenTaskUpdated).toHaveBeenCalled();
        expect(listenTaskDeleted).toHaveBeenCalled();
        expect(listenProjectChanged).toHaveBeenCalled();
    });
    it("task:created の受信で onTaskEvent('created', payload) が呼ばれる", async () => {
        const onTaskEvent = vi.fn();
        const onProjectChanged = vi.fn();
        let captured = null;
        listenTaskCreated.mockImplementationOnce(async (cb) => {
            captured = cb;
            return unlistenTaskCreated;
        });
        renderHook(() => useBoardSync({ onTaskEvent, onProjectChanged }));
        await Promise.resolve();
        captured({ taskId: "T1", projectId: "P1" });
        expect(onTaskEvent).toHaveBeenCalledWith("created", { taskId: "T1", projectId: "P1" });
    });
    it("アンマウントで unlisten 関数が呼ばれる", async () => {
        const { unmount } = renderHook(() => useBoardSync({ onTaskEvent: vi.fn(), onProjectChanged: vi.fn() }));
        // listenが解決するのを待つ
        await Promise.resolve();
        await Promise.resolve();
        unmount();
        // unmount後にlistenが解決した場合のクリーンアップも考慮
        await Promise.resolve();
        expect(unlistenTaskCreated).toHaveBeenCalled();
        expect(unlistenTaskUpdated).toHaveBeenCalled();
        expect(unlistenTaskDeleted).toHaveBeenCalled();
        expect(unlistenProjectChanged).toHaveBeenCalled();
    });
    it("onWorkLogAdded を渡さない場合は worklog:added を listen しない", async () => {
        renderHook(() => useBoardSync({ onTaskEvent: vi.fn(), onProjectChanged: vi.fn() }));
        await Promise.resolve();
        expect(listenWorkLogAdded).not.toHaveBeenCalled();
    });
    it("onWorkLogAdded を渡すと worklog:added を listen する", async () => {
        const onWorkLogAdded = vi.fn();
        renderHook(() => useBoardSync({ onTaskEvent: vi.fn(), onProjectChanged: vi.fn(), onWorkLogAdded }));
        await Promise.resolve();
        expect(listenWorkLogAdded).toHaveBeenCalled();
    });
    it("worklog:added の受信で onWorkLogAdded(payload) が呼ばれる", async () => {
        const onWorkLogAdded = vi.fn();
        let captured = null;
        listenWorkLogAdded.mockImplementationOnce(async (cb) => {
            captured = cb;
            return unlistenWorkLogAdded;
        });
        renderHook(() => useBoardSync({ onTaskEvent: vi.fn(), onProjectChanged: vi.fn(), onWorkLogAdded }));
        await Promise.resolve();
        captured({ taskId: "T1", projectId: "P1" });
        expect(onWorkLogAdded).toHaveBeenCalledWith({ taskId: "T1", projectId: "P1" });
    });
    it("onWorkLogAdded 指定時はアンマウントで unlisten される", async () => {
        const { unmount } = renderHook(() => useBoardSync({
            onTaskEvent: vi.fn(),
            onProjectChanged: vi.fn(),
            onWorkLogAdded: vi.fn(),
        }));
        await Promise.resolve();
        await Promise.resolve();
        unmount();
        await Promise.resolve();
        expect(unlistenWorkLogAdded).toHaveBeenCalled();
    });
});
