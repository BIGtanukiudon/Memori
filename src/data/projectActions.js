import { createProject, deleteProject, renameProject, } from "@/db/projects";
import { useBoardStore } from "@/store/boardStore";
export async function createProjectAction(db, name) {
    const project = await createProject(db, name);
    const store = useBoardStore.getState();
    store.upsertProject(project);
    if (!store.currentProjectId) {
        store.setCurrentProject(project.id);
    }
    return project;
}
export async function renameProjectAction(db, id, name) {
    await renameProject(db, id, name);
    const store = useBoardStore.getState();
    const target = store.projects.find((p) => p.id === id);
    if (!target)
        return;
    store.upsertProject({
        ...target,
        name: name.trim(),
        updatedAt: new Date().toISOString(),
    });
}
export async function deleteProjectAction(db, id) {
    await deleteProject(db, id);
    const prev = useBoardStore.getState();
    const wasCurrent = prev.currentProjectId === id;
    prev.removeProject(id);
    // 削除プロジェクト配下の列・タスクを除外（CASCADE済みのDBに合わせる）
    useBoardStore.setState((s) => ({
        columns: s.columns.filter((c) => c.projectId !== id),
        tasks: s.tasks.filter((t) => t.projectId !== id),
    }));
    if (wasCurrent) {
        const next = useBoardStore.getState().projects[0]?.id ?? null;
        useBoardStore.getState().setCurrentProject(next);
    }
}
export async function countTasksInProject(db, projectId) {
    const rows = await db.select("SELECT COUNT(*) AS n FROM tasks WHERE project_id = ?", [projectId]);
    return rows[0]?.n ?? 0;
}
