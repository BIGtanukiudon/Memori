import { describe, expect, it } from "vitest";
import { Priority } from "@/lib/priority";
import type { BoardState } from "./boardStore";
import { selectCurrentProject, selectSortedColumns, selectTasksByColumn } from "./selectors";

const baseState = (): Pick<BoardState, "projects" | "currentProjectId" | "columns" | "tasks"> => ({
  projects: [
    {
      id: "P1",
      name: "開発",
      createdAt: "2026-05-10T10:00:00.000Z",
      updatedAt: "2026-05-10T10:00:00.000Z",
    },
    {
      id: "P2",
      name: "個人",
      createdAt: "2026-05-11T10:00:00.000Z",
      updatedAt: "2026-05-11T10:00:00.000Z",
    },
  ],
  currentProjectId: "P1",
  columns: [
    { id: "C1", projectId: "P1", name: "Doing", position: 1 },
    { id: "C0", projectId: "P1", name: "Todo", position: 0 },
  ],
  tasks: [
    {
      id: "T1",
      projectId: "P1",
      columnId: "C0",
      title: "B",
      memo: null,
      dueDate: null,
      priority: Priority.None,
      position: 1,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "T0",
      projectId: "P1",
      columnId: "C0",
      title: "A",
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
      title: "X",
      memo: null,
      dueDate: null,
      priority: Priority.None,
      position: 0,
      createdAt: "",
      updatedAt: "",
    },
  ],
});

describe("selectCurrentProject", () => {
  it("currentProjectIdに対応するProjectを返す", () => {
    expect(selectCurrentProject(baseState())?.id).toBe("P1");
  });
  it("currentがnullならnull", () => {
    expect(selectCurrentProject({ ...baseState(), currentProjectId: null })).toBeNull();
  });
});

describe("selectSortedColumns", () => {
  it("position昇順で返す", () => {
    expect(selectSortedColumns(baseState()).map((c) => c.id)).toEqual(["C0", "C1"]);
  });
});

describe("selectTasksByColumn", () => {
  it("各列内をposition昇順でグループ化したMapを返す", () => {
    const map = selectTasksByColumn(baseState());
    expect(map.get("C0")!.map((t) => t.id)).toEqual(["T0", "T1"]);
    expect(map.get("C1")!.map((t) => t.id)).toEqual(["T2"]);
  });
});
