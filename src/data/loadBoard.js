import { listProjects } from "@/db/projects";
import { listColumns } from "@/db/columns";
import { listTasksByProject } from "@/db/tasks";
export async function loadInitialBoard(db) {
    const projects = await listProjects(db);
    const first = projects[0];
    if (!first) {
        return { projects: [], currentProjectId: null, columns: [], tasks: [] };
    }
    const { columns, tasks } = await loadProjectData(db, first.id);
    return { projects, currentProjectId: first.id, columns, tasks };
}
export async function loadProjectData(db, projectId) {
    const columns = await listColumns(db, projectId);
    const tasks = await listTasksByProject(db, projectId);
    return { columns, tasks };
}
