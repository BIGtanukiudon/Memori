import { describe, expect, it, beforeEach } from "vitest";
import { createMockDb } from "../../tests/helpers/mockDb";
import { useBoardStore } from "@/store/boardStore";
import {
  createProjectAction,
  renameProjectAction,
  deleteProjectAction,
  countTasksInProject,
  reorderProjectsAction,
  setDoneColumnAction,
} from "./projectActions";

beforeEach(() => {
  useBoardStore.getState().reset();
});

describe("createProjectAction", () => {
  it("DBにINSERTし、storeへ追加してcurrent未設定なら選択状態にする", async () => {
    const db = createMockDb();
    const p = await createProjectAction(db, "新規P");

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT INTO projects/),
      expect.arrayContaining([p.id, "新規P"]),
    );
    const s = useBoardStore.getState();
    expect(s.projects.map((x) => x.id)).toEqual([p.id]);
    expect(s.currentProjectId).toBe(p.id);
  });

  it("空白のみは弾く", async () => {
    const db = createMockDb();
    await expect(createProjectAction(db, "   ")).rejects.toThrow();
  });

  it("既にcurrentが選択されていれば変更しない", async () => {
    const db = createMockDb();
    useBoardStore.setState({
      projects: [{ id: "P0", name: "既存", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" }],
      currentProjectId: "P0",
    });
    const p = await createProjectAction(db, "別");
    expect(useBoardStore.getState().currentProjectId).toBe("P0");
    expect(useBoardStore.getState().projects.map((x) => x.id)).toEqual(["P0", p.id]);
  });
});

describe("renameProjectAction", () => {
  it("DB UPDATEとstore反映を行う", async () => {
    const db = createMockDb();
    useBoardStore.setState({
      projects: [{ id: "P1", name: "旧", position: 0, doneColumnId: null, createdAt: "t0", updatedAt: "t0" }],
    });
    await renameProjectAction(db, "P1", " 新 ");

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE projects/),
      expect.arrayContaining(["新", "P1"]),
    );
    const p = useBoardStore.getState().projects[0]!;
    expect(p.name).toBe("新");
    expect(p.updatedAt).not.toBe("t0");
  });
});

describe("deleteProjectAction", () => {
  it("DB DELETEとstoreから削除する", async () => {
    const db = createMockDb();
    useBoardStore.setState({
      projects: [
        { id: "P1", name: "A", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" },
        { id: "P2", name: "B", position: 1, doneColumnId: null, createdAt: "", updatedAt: "" },
      ],
      currentProjectId: "P1",
      columns: [{ id: "C1", projectId: "P1", name: "Todo", position: 0 }],
      tasks: [],
    });

    await deleteProjectAction(db, "P1");

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM projects/),
      ["P1"],
    );
    const s = useBoardStore.getState();
    expect(s.projects.map((x) => x.id)).toEqual(["P2"]);
    expect(s.currentProjectId).toBe("P2"); // 先頭のプロジェクトに切り替え
    expect(s.columns).toEqual([]);
  });

  it("削除後にプロジェクトが0件ならcurrentはnull", async () => {
    const db = createMockDb();
    useBoardStore.setState({
      projects: [{ id: "P1", name: "A", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" }],
      currentProjectId: "P1",
    });
    await deleteProjectAction(db, "P1");
    expect(useBoardStore.getState().currentProjectId).toBeNull();
  });
});

describe("reorderProjectsAction", () => {
  it("DB並び替えとstore反映を行う", async () => {
    const db = createMockDb();
    useBoardStore.setState({
      projects: [
        { id: "P1", name: "A", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" },
        { id: "P2", name: "B", position: 1, doneColumnId: null, createdAt: "", updatedAt: "" },
        { id: "P3", name: "C", position: 2, doneColumnId: null, createdAt: "", updatedAt: "" },
      ],
    });

    await reorderProjectsAction(db, ["P3", "P1", "P2"]);

    expect(db.execute).toHaveBeenCalledTimes(3);
    const ps = [...useBoardStore.getState().projects].sort((a, b) => a.position - b.position);
    expect(ps.map((p) => p.id)).toEqual(["P3", "P1", "P2"]);
  });
});

describe("setDoneColumnAction", () => {
  it("DBに完了列IDを設定し、storeのprojectを更新する", async () => {
    const db = createMockDb();
    useBoardStore.setState({
      projects: [{ id: "P1", name: "A", position: 0, doneColumnId: null, createdAt: "", updatedAt: "" }],
    });
    await setDoneColumnAction(db, "P1", "C_DONE");

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE projects SET done_column_id/),
      ["C_DONE", "P1"],
    );
    expect(useBoardStore.getState().projects[0]!.doneColumnId).toBe("C_DONE");
  });

  it("nullを渡すと完了列をクリアする", async () => {
    const db = createMockDb();
    useBoardStore.setState({
      projects: [{ id: "P1", name: "A", position: 0, doneColumnId: "C_DONE", createdAt: "", updatedAt: "" }],
    });
    await setDoneColumnAction(db, "P1", null);

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE projects SET done_column_id/),
      [null, "P1"],
    );
    expect(useBoardStore.getState().projects[0]!.doneColumnId).toBeNull();
  });
});

describe("countTasksInProject", () => {
  it("DBから件数を取得する", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([{ n: 3 }]);
    const n = await countTasksInProject(db, "P1");
    expect(n).toBe(3);
    expect(db.select).toHaveBeenCalledWith(
      expect.stringMatching(/SELECT COUNT.*FROM tasks/i),
      ["P1"],
    );
  });

  it("結果が空なら0", async () => {
    const db = createMockDb();
    db.select.mockResolvedValueOnce([]);
    expect(await countTasksInProject(db, "P1")).toBe(0);
  });
});
