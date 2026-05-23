import { describe, expect, it } from "vitest";
import { createMockDb } from "../../tests/helpers/mockDb";
import { loadInitialBoard, loadProjectData } from "./loadBoard";

describe("loadInitialBoard", () => {
  it("プロジェクト一覧と最初のプロジェクトの列・タスクを取得する", async () => {
    const db = createMockDb();
    // 1. listProjects
    db.select.mockResolvedValueOnce([
      {
        id: "P1",
        name: "開発",
        created_at: "2026-05-10T10:00:00.000Z",
        updated_at: "2026-05-10T10:00:00.000Z",
      },
    ]);
    // 2. listColumns (P1)
    db.select.mockResolvedValueOnce([{ id: "C0", project_id: "P1", name: "Todo", position: 0 }]);
    // 3. listTasksByProject (P1)
    db.select.mockResolvedValueOnce([
      {
        id: "T0",
        project_id: "P1",
        column_id: "C0",
        title: "x",
        memo: null,
        due_date: null,
        priority: 0,
        position: 0,
        created_at: "",
        updated_at: "",
      },
    ]);

    const res = await loadInitialBoard(db);
    expect(res.projects.map((p) => p.id)).toEqual(["P1"]);
    expect(res.currentProjectId).toBe("P1");
    expect(res.columns.map((c) => c.id)).toEqual(["C0"]);
    expect(res.tasks.map((t) => t.id)).toEqual(["T0"]);
  });

  it("プロジェクトが0件ならcurrentProjectIdはnull・columns/tasks空", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([]);
    const res = await loadInitialBoard(db);
    expect(res.projects).toEqual([]);
    expect(res.currentProjectId).toBeNull();
    expect(res.columns).toEqual([]);
    expect(res.tasks).toEqual([]);
  });
});

describe("loadProjectData", () => {
  it("指定プロジェクトの列・タスクを取得する", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([{ id: "C0", project_id: "P1", name: "Todo", position: 0 }]);
    db.select.mockResolvedValueOnce([]);

    const res = await loadProjectData(db, "P1");
    expect(res.columns.map((c) => c.id)).toEqual(["C0"]);
    expect(res.tasks).toEqual([]);
  });
});
