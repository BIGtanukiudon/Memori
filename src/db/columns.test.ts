import { describe, expect, it } from "vitest";
import {
  createColumn,
  deleteColumn,
  listAllColumns,
  listColumns,
  moveTasksToColumn,
  renameColumn,
  reorderColumns,
} from "./columns";
import { createMockDb } from "../../tests/helpers/mockDb";

describe("createColumn", () => {
  it("プロジェクト末尾(max(position)+1)に新規列を追加する", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([{ next: 3 }]);

    const col = await createColumn(db, "01PROJECT", "Todo");

    expect(col.id).toHaveLength(26);
    expect(col.projectId).toBe("01PROJECT");
    expect(col.name).toBe("Todo");
    expect(col.position).toBe(3);

    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/INSERT INTO columns/i);
    expect(params).toEqual([col.id, "01PROJECT", "Todo", 3]);
  });

  it("既存列が無い場合のposition=0", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([{ next: 0 }]);
    const col = await createColumn(db, "01PROJECT", "Todo");
    expect(col.position).toBe(0);
  });

  it("空文字はエラー", async () => {
    const db = createMockDb();
    await expect(createColumn(db, "01PROJECT", "")).rejects.toThrow();
  });
});

describe("listColumns", () => {
  it("project_idでフィルタしposition昇順で返す", async () => {
    const db = createMockDb();
    db.select.mockResolvedValue([
      { id: "C0", project_id: "P", name: "Todo", position: 0 },
      { id: "C1", project_id: "P", name: "Doing", position: 1 },
    ]);

    const result = await listColumns(db, "P");
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("Todo");

    const [sql, params] = db.select.mock.calls[0]!;
    expect(sql).toMatch(/WHERE project_id = .*ORDER BY position/is);
    expect(params).toEqual(["P"]);
  });
});

describe("listAllColumns", () => {
  it("全プロジェクトの列をproject_id,position昇順で返す", async () => {
    const db = createMockDb();
    db.select.mockResolvedValue([
      { id: "C0", project_id: "P1", name: "Todo", position: 0 },
      { id: "C1", project_id: "P2", name: "Backlog", position: 0 },
    ]);
    const result = await listAllColumns(db);
    expect(result.map((c) => c.id)).toEqual(["C0", "C1"]);
    const [sql] = db.select.mock.calls[0]!;
    expect(sql).toMatch(/ORDER BY project_id, position/i);
  });
});

describe("renameColumn", () => {
  it("nameを更新する", async () => {
    const db = createMockDb();
    await renameColumn(db, "C0", "進行中");

    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/UPDATE columns SET name = /i);
    expect(params).toEqual(["進行中", "C0"]);
  });

  it("空文字はエラー", async () => {
    const db = createMockDb();
    await expect(renameColumn(db, "C0", "")).rejects.toThrow();
  });
});

describe("reorderColumns", () => {
  it("与えた順で0始まりにposition再採番する", async () => {
    const db = createMockDb();
    await reorderColumns(db, "P", ["C2", "C0", "C1"]);

    expect(db.execute).toHaveBeenCalledTimes(3);
    expect(db.execute.mock.calls[0]![1]).toEqual([0, "C2"]);
    expect(db.execute.mock.calls[1]![1]).toEqual([1, "C0"]);
    expect(db.execute.mock.calls[2]![1]).toEqual([2, "C1"]);
    const [sql] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/UPDATE columns SET position = /i);
  });
});

describe("deleteColumn", () => {
  it("DELETEを発行する", async () => {
    const db = createMockDb();
    await deleteColumn(db, "C0");
    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/DELETE FROM columns WHERE id = /i);
    expect(params).toEqual(["C0"]);
  });
});

describe("moveTasksToColumn", () => {
  it("from列の全タスクをto列に移動し、to列末尾に追記する", async () => {
    const db = createMockDb();
    // to列の現在のposition最大値+1の初期値
    db.select.mockResolvedValueOnce([{ next: 5 }]);
    // from列のタスク一覧 (position昇順)
    db.select.mockResolvedValueOnce([
      { id: "T1" },
      { id: "T2" },
    ]);

    await moveTasksToColumn(db, "C_FROM", "C_TO");

    // 2件分のUPDATEが発行される
    expect(db.execute).toHaveBeenCalledTimes(2);
    expect(db.execute.mock.calls[0]![1]).toEqual(["C_TO", 5, expect.any(String), "T1"]);
    expect(db.execute.mock.calls[1]![1]).toEqual(["C_TO", 6, expect.any(String), "T2"]);
    const [sql] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/UPDATE tasks SET column_id = .*position = .*updated_at = /is);
  });
});
