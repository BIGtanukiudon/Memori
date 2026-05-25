import { beforeEach, describe, expect, it } from "vitest";
import { createMockDb } from "../../tests/helpers/mockDb";
import { useBoardStore } from "@/store/boardStore";
import { Priority } from "@/lib/priority";
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  moveTaskAction,
} from "./taskActions";

beforeEach(() => {
  useBoardStore.getState().reset();
});

describe("createTaskAction", () => {
  it("DB INSERTとstoreへの追加を行う", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([{ next: 0 }]);
    useBoardStore.setState({
      projects: [{ id: "P1", name: "", position: 0, createdAt: "", updatedAt: "" }],
      columns: [{ id: "C1", projectId: "P1", name: "Todo", position: 0 }],
      tasks: [],
    });
    const t = await createTaskAction(db, {
      projectId: "P1",
      columnId: "C1",
      title: "新規",
    });
    expect(t.title).toBe("新規");
    expect(useBoardStore.getState().tasks.map((x) => x.id)).toEqual([t.id]);
  });
});

describe("updateTaskAction", () => {
  it("DB UPDATE と store の該当タスクを更新", async () => {
    const db = createMockDb();
    useBoardStore.setState({
      tasks: [
        {
          id: "T1",
          projectId: "P1",
          columnId: "C1",
          title: "旧",
          memo: null,
          dueDate: null,
          priority: Priority.None,
          position: 0,
          createdAt: "t0",
          updatedAt: "t0",
        },
      ],
    });
    await updateTaskAction(db, "T1", {
      title: "新",
      memo: "メモ",
      dueDate: "2026-06-01",
      priority: Priority.High,
    });
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE tasks SET/),
      expect.any(Array),
    );
    const t = useBoardStore.getState().tasks[0]!;
    expect(t.title).toBe("新");
    expect(t.memo).toBe("メモ");
    expect(t.dueDate).toBe("2026-06-01");
    expect(t.priority).toBe(Priority.High);
    expect(t.updatedAt).not.toBe("t0");
  });
});

describe("deleteTaskAction", () => {
  it("DB DELETE と storeから除外", async () => {
    const db = createMockDb();
    useBoardStore.setState({
      tasks: [
        {
          id: "T1",
          projectId: "P1",
          columnId: "C1",
          title: "x",
          memo: null,
          dueDate: null,
          priority: Priority.None,
          position: 0,
          createdAt: "",
          updatedAt: "",
        },
      ],
    });
    await deleteTaskAction(db, "T1");
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM tasks/),
      ["T1"],
    );
    expect(useBoardStore.getState().tasks).toEqual([]);
  });
});

describe("moveTaskAction", () => {
  const baseTasks = [
    {
      id: "T1",
      projectId: "P1",
      columnId: "C1",
      title: "1",
      memo: null,
      dueDate: null,
      priority: Priority.None,
      position: 0,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "T2",
      projectId: "P1",
      columnId: "C1",
      title: "2",
      memo: null,
      dueDate: null,
      priority: Priority.None,
      position: 1,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "T3",
      projectId: "P1",
      columnId: "C2",
      title: "3",
      memo: null,
      dueDate: null,
      priority: Priority.None,
      position: 0,
      createdAt: "",
      updatedAt: "",
    },
  ];

  it("同列内の並び替え", async () => {
    const db = createMockDb();
    useBoardStore.setState({ tasks: [...baseTasks] });
    // T2 を C1 の先頭 (index 0) に移動
    await moveTaskAction(db, {
      taskId: "T2",
      toColumnId: "C1",
      toIndex: 0,
    });
    const c1 = useBoardStore
      .getState()
      .tasks.filter((t) => t.columnId === "C1")
      .sort((a, b) => a.position - b.position);
    expect(c1.map((t) => t.id)).toEqual(["T2", "T1"]);
    expect(c1.map((t) => t.position)).toEqual([0, 1]);
    // reorderTasks の UPDATE が呼ばれる
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE tasks SET position/),
      expect.any(Array),
    );
  });

  it("列間の移動", async () => {
    const db = createMockDb();
    useBoardStore.setState({ tasks: [...baseTasks] });
    // T1 を C2 の末尾(index=1)へ
    await moveTaskAction(db, {
      taskId: "T1",
      toColumnId: "C2",
      toIndex: 1,
    });
    const c1 = useBoardStore
      .getState()
      .tasks.filter((t) => t.columnId === "C1")
      .sort((a, b) => a.position - b.position);
    const c2 = useBoardStore
      .getState()
      .tasks.filter((t) => t.columnId === "C2")
      .sort((a, b) => a.position - b.position);
    expect(c1.map((t) => t.id)).toEqual(["T2"]);
    expect(c2.map((t) => t.id)).toEqual(["T3", "T1"]);

    // updateTaskColumn と reorderTasks(両列) が呼ばれる
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE tasks SET column_id/),
      expect.arrayContaining(["C2", "T1"]),
    );
  });
});
