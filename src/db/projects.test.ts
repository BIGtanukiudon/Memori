import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProject, deleteProject, listProjects, renameProject, reorderProjects, updateDoneColumn } from "./projects";
import { createMockDb } from "../../tests/helpers/mockDb";

describe("createProject", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 12, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("ULIDと現在時刻を採番してINSERTし、作成したProjectを返す", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([{ next: 0 }]);
    const p = await createProject(db, "開発");

    expect(p.id).toHaveLength(26);
    expect(p.name).toBe("開発");
    expect(p.position).toBe(0);
    expect(p.doneColumnId).toBeNull();
    expect(p.createdAt).toBe(p.updatedAt);
    expect(db.execute).toHaveBeenCalledTimes(1);

    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/INSERT INTO projects/i);
    expect(params).toEqual([p.id, "開発", 0, p.createdAt, p.updatedAt]);
  });

  it("既存プロジェクトがある場合、positionは次の値が設定される", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([{ next: 3 }]);
    const p = await createProject(db, "新規");
    expect(p.position).toBe(3);
  });

  it("名前の前後空白はトリムする", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([{ next: 0 }]);
    const p = await createProject(db, "  test  ");
    expect(p.name).toBe("test");
  });

  it("空文字や空白のみはエラー", async () => {
    const db = createMockDb();
    await expect(createProject(db, "")).rejects.toThrow();
    await expect(createProject(db, "   ")).rejects.toThrow();
    expect(db.execute).not.toHaveBeenCalled();
  });
});

describe("listProjects", () => {
  it("position昇順で全プロジェクトを返す", async () => {
    const db = createMockDb();
    db.select.mockResolvedValue([
      {
        id: "01A",
        name: "プロジェクトA",
        position: 0,
        done_column_id: null,
        created_at: "2026-05-10T10:00:00.000Z",
        updated_at: "2026-05-10T10:00:00.000Z",
      },
      {
        id: "01B",
        name: "プロジェクトB",
        position: 1,
        done_column_id: "C_DONE",
        created_at: "2026-05-11T10:00:00.000Z",
        updated_at: "2026-05-11T10:00:00.000Z",
      },
    ]);

    const result = await listProjects(db);
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("プロジェクトA");
    expect(result[0]!.doneColumnId).toBeNull();
    expect(result[1]!.doneColumnId).toBe("C_DONE");
    expect(db.select.mock.calls[0]![0]).toMatch(/ORDER BY position/i);
  });
});

describe("renameProject", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 12, 13, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("nameとupdated_atを更新する", async () => {
    const db = createMockDb();
    await renameProject(db, "01PROJECT", "新名称");

    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/UPDATE projects/i);
    expect(sql).toMatch(/SET name = .*updated_at = /is);
    expect(params).toHaveLength(3);
    expect(params[0]).toBe("新名称");
    expect(params[2]).toBe("01PROJECT");
  });

  it("空文字はエラー", async () => {
    const db = createMockDb();
    await expect(renameProject(db, "01PROJECT", "")).rejects.toThrow();
  });
});

describe("reorderProjects", () => {
  it("与えたID順でpositionをUPDATEする", async () => {
    const db = createMockDb();
    await reorderProjects(db, ["P2", "P0", "P1"]);

    expect(db.execute).toHaveBeenCalledTimes(3);
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE projects SET position/i),
      [0, "P2"],
    );
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE projects SET position/i),
      [1, "P0"],
    );
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE projects SET position/i),
      [2, "P1"],
    );
  });

  it("空配列の場合はDB操作しない", async () => {
    const db = createMockDb();
    await reorderProjects(db, []);
    expect(db.execute).not.toHaveBeenCalled();
  });
});

describe("updateDoneColumn", () => {
  it("done_column_idを設定する", async () => {
    const db = createMockDb();
    await updateDoneColumn(db, "01PROJECT", "01COL_DONE");

    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/UPDATE projects SET done_column_id = /i);
    expect(params).toEqual(["01COL_DONE", "01PROJECT"]);
  });

  it("done_column_idをnullにクリアする", async () => {
    const db = createMockDb();
    await updateDoneColumn(db, "01PROJECT", null);

    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/UPDATE projects SET done_column_id = /i);
    expect(params).toEqual([null, "01PROJECT"]);
  });
});

describe("deleteProject", () => {
  it("DELETEを発行する（CASCADEで配下も削除される想定）", async () => {
    const db = createMockDb();
    await deleteProject(db, "01PROJECT");

    const [sql, params] = db.execute.mock.calls[0]!;
    expect(sql).toMatch(/DELETE FROM projects WHERE id = /i);
    expect(params).toEqual(["01PROJECT"]);
  });
});
