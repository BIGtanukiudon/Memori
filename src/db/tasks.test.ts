import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTask,
  deleteTask,
  listTasks,
  listTasksByColumn,
  listTasksByProject,
  reorderTasks,
  updateTask,
  updateTaskColumn,
} from "./tasks";
import { Priority } from "@/lib/priority";
import { createMockDb } from "../../tests/helpers/mockDb";

describe("createTask", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 12, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("対象列末尾(max(position)+1)に追加する", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([{ next: 2 }]);

    const t = await createTask(db, {
      projectId: "P",
      columnId: "C",
      title: "実装する",
      memo: "メモ",
      dueDate: "2026-05-15",
      priority: Priority.High,
    });

    expect(t.id).toHaveLength(26);
    expect(t.projectId).toBe("P");
    expect(t.columnId).toBe("C");
    expect(t.title).toBe("実装する");
    expect(t.memo).toBe("メモ");
    expect(t.dueDate).toBe("2026-05-15");
    expect(t.priority).toBe(Priority.High);
    expect(t.position).toBe(2);
    expect(t.createdAt).toBe(t.updatedAt);

    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/INSERT INTO tasks/i);
    expect(params).toEqual([
      t.id,
      "P",
      "C",
      "実装する",
      "メモ",
      "2026-05-15",
      Priority.High,
      2,
      t.createdAt,
      t.updatedAt,
    ]);
  });

  it("memo/dueDate省略時はnull、優先度省略時はNone、completedAtはnull", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([{ next: 0 }]);

    const t = await createTask(db, {
      projectId: "P",
      columnId: "C",
      title: "x",
    });

    expect(t.memo).toBeNull();
    expect(t.dueDate).toBeNull();
    expect(t.priority).toBe(Priority.None);
    expect(t.completedAt).toBeNull();
  });

  it("タイトルは必須で前後空白はトリム", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([{ next: 0 }]);
    const t = await createTask(db, { projectId: "P", columnId: "C", title: "  abc  " });
    expect(t.title).toBe("abc");
  });

  it("タイトル空はエラー", async () => {
    const db = createMockDb();
    await expect(
      createTask(db, { projectId: "P", columnId: "C", title: "  " }),
    ).rejects.toThrow();
  });
});

describe("listTasks/listTasksByProject/listTasksByColumn", () => {
  const row = (over: Partial<Record<string, unknown>> = {}) => ({
    id: "T",
    project_id: "P",
    column_id: "C",
    title: "x",
    memo: null,
    due_date: null,
    priority: 0,
    position: 0,
    completed_at: null,
    created_at: "2026-05-12T10:00:00.000Z",
    updated_at: "2026-05-12T10:00:00.000Z",
    ...over,
  });

  it("listTasks: 全件をmapper通して返す", async () => {
    const db = createMockDb();
    db.select.mockResolvedValue([row({ id: "T1" }), row({ id: "T2" })]);
    const res = await listTasks(db);
    expect(res).toHaveLength(2);
    expect(res[0]!.id).toBe("T1");
  });

  it("listTasksByProject: project_idでフィルタ", async () => {
    const db = createMockDb();
    db.select.mockResolvedValue([row()]);
    await listTasksByProject(db, "P");
    const [sql, params] = db.select.mock.calls[0]!;
    expect(sql).toMatch(/WHERE project_id = /i);
    expect(params).toEqual(["P"]);
  });

  it("listTasksByColumn: column_idでフィルタしposition昇順", async () => {
    const db = createMockDb();
    db.select.mockResolvedValue([row()]);
    await listTasksByColumn(db, "C");
    const [sql, params] = db.select.mock.calls[0]!;
    expect(sql).toMatch(/WHERE column_id = .*ORDER BY position/is);
    expect(params).toEqual(["C"]);
  });
});

describe("updateTask", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 12, 14, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("指定フィールドのみを更新しupdated_atも更新する", async () => {
    const db = createMockDb();
    await updateTask(db, "T", { title: "new", priority: Priority.Low });

    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/UPDATE tasks SET/i);
    expect(sql).toMatch(/title = /);
    expect(sql).toMatch(/priority = /);
    expect(sql).toMatch(/updated_at = /);
    expect(sql).not.toMatch(/memo = /);
    expect(sql).toMatch(/WHERE id = /);
    // 末尾はupdated_at, idの順
    expect(params[params.length - 1]).toBe("T");
  });

  it("patchが空ならDBへ問い合わせない", async () => {
    const db = createMockDb();
    await updateTask(db, "T", {});
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("memo/dueDateは明示的にnullを設定できる", async () => {
    const db = createMockDb();
    await updateTask(db, "T", { memo: null, dueDate: null });
    const [, params] = db.execute.mock.calls[0]!;
    // memo, due_date, updated_at, id
    expect(params).toHaveLength(4);
    expect(params[0]).toBeNull();
    expect(params[1]).toBeNull();
    expect(params[3]).toBe("T");
  });
});

describe("updateTaskColumn", () => {
  it("column_idとupdated_atを更新する", async () => {
    const db = createMockDb();
    await updateTaskColumn(db, "T", "C2");
    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/UPDATE tasks SET column_id = .*updated_at = /is);
    expect(params).toHaveLength(3);
    expect(params[0]).toBe("C2");
    expect(params[2]).toBe("T");
  });

  it("completedAtを指定すると completed_at も更新する", async () => {
    const db = createMockDb();
    await updateTaskColumn(db, "T", "C2", "2026-05-12T12:00:00.000Z");
    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/completed_at = /i);
    expect(params).toContain("2026-05-12T12:00:00.000Z");
  });

  it("completedAtにnullを指定すると completed_at をクリアする", async () => {
    const db = createMockDb();
    await updateTaskColumn(db, "T", "C2", null);
    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/completed_at = /i);
    expect(params).toContain(null);
  });
});

describe("reorderTasks", () => {
  it("与えた順で0始まりにposition再採番（同時にupdated_atも更新）", async () => {
    const db = createMockDb();
    await reorderTasks(db, "C", ["T2", "T0", "T1"]);

    expect(db.execute).toHaveBeenCalledTimes(3);
    expect(db.execute.mock.calls[0]![1]![0]).toBe(0);
    expect(db.execute.mock.calls[0]![1]![2]).toBe("T2");
    expect(db.execute.mock.calls[1]![1]![0]).toBe(1);
    expect(db.execute.mock.calls[1]![1]![2]).toBe("T0");
    expect(db.execute.mock.calls[2]![1]![0]).toBe(2);
    expect(db.execute.mock.calls[2]![1]![2]).toBe("T1");
    const [sql] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/UPDATE tasks SET position = .*updated_at = /is);
  });
});

describe("deleteTask", () => {
  it("DELETEを発行する", async () => {
    const db = createMockDb();
    await deleteTask(db, "T");
    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/DELETE FROM tasks WHERE id = /i);
    expect(params).toEqual(["T"]);
  });
});
