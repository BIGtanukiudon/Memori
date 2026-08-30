import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
const getDb = vi.fn();
const listWorkLogsByTask = vi.fn();
const createWorkLogAction = vi.fn();
const updateWorkLogAction = vi.fn();
const deleteWorkLogAction = vi.fn();
vi.mock("@/db/connection", () => ({
    getDb: (...a) => getDb(...a),
}));
vi.mock("@/db/workLogs", () => ({
    listWorkLogsByTask: (...a) => listWorkLogsByTask(...a),
}));
vi.mock("./workLogActions", () => ({
    createWorkLogAction: (...a) => createWorkLogAction(...a),
    updateWorkLogAction: (...a) => updateWorkLogAction(...a),
    deleteWorkLogAction: (...a) => deleteWorkLogAction(...a),
}));
import { useWorkLogs } from "./useWorkLogs";
const DB = { select: vi.fn(), execute: vi.fn() };
const log = (id) => ({
    id,
    taskId: "T1",
    projectId: "P1",
    body: `本文${id}`,
    taskTitle: "タスク",
    projectName: "プロジェクト",
    createdAt: "2026-08-30T00:00:00.000Z",
    updatedAt: "2026-08-30T00:00:00.000Z",
});
beforeEach(() => {
    getDb.mockReset().mockResolvedValue(DB);
    listWorkLogsByTask.mockReset().mockResolvedValue([]);
    createWorkLogAction.mockReset().mockResolvedValue(log("L1"));
    updateWorkLogAction.mockReset().mockResolvedValue(undefined);
    deleteWorkLogAction.mockReset().mockResolvedValue(undefined);
});
describe("useWorkLogs", () => {
    it("マウント時にtaskIdのログをロードする", async () => {
        listWorkLogsByTask.mockResolvedValue([log("L1")]);
        const { result } = renderHook(() => useWorkLogs("T1"));
        await waitFor(() => expect(result.current.workLogs).toHaveLength(1));
        expect(listWorkLogsByTask).toHaveBeenCalledWith(DB, "T1");
    });
    it("taskIdがnullならロードせず空配列", async () => {
        const { result } = renderHook(() => useWorkLogs(null));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.workLogs).toEqual([]);
        expect(listWorkLogsByTask).not.toHaveBeenCalled();
    });
    it("addWorkLogでcreateWorkLogActionが呼ばれ再ロードされる", async () => {
        const { result } = renderHook(() => useWorkLogs("T1"));
        await waitFor(() => expect(result.current.loading).toBe(false));
        listWorkLogsByTask.mockResolvedValue([log("L1")]);
        await act(async () => {
            await result.current.addWorkLog("新しい作業内容");
        });
        expect(createWorkLogAction).toHaveBeenCalledWith(DB, {
            taskId: "T1",
            body: "新しい作業内容",
        });
        expect(result.current.workLogs).toHaveLength(1);
    });
    it("taskIdが変わると新しいtaskIdで再ロードされる", async () => {
        const { rerender } = renderHook(({ taskId }) => useWorkLogs(taskId), {
            initialProps: { taskId: "T1" },
        });
        await waitFor(() => expect(listWorkLogsByTask).toHaveBeenCalledWith(DB, "T1"));
        rerender({ taskId: "T2" });
        await waitFor(() => expect(listWorkLogsByTask).toHaveBeenCalledWith(DB, "T2"));
    });
    it("updateWorkLogでupdateWorkLogActionが呼ばれ再ロードされる", async () => {
        const { result } = renderHook(() => useWorkLogs("T1"));
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => {
            await result.current.updateWorkLog("L1", "更新後");
        });
        expect(updateWorkLogAction).toHaveBeenCalledWith(DB, "L1", "更新後");
        expect(listWorkLogsByTask).toHaveBeenCalledTimes(2);
    });
    it("deleteWorkLogでdeleteWorkLogActionが呼ばれ再ロードされる", async () => {
        const { result } = renderHook(() => useWorkLogs("T1"));
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => {
            await result.current.deleteWorkLog("L1");
        });
        expect(deleteWorkLogAction).toHaveBeenCalledWith(DB, "L1");
        expect(listWorkLogsByTask).toHaveBeenCalledTimes(2);
    });
});
