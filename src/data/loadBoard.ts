import { listProjects } from "@/db/projects";
import { listColumns } from "@/db/columns";
import { listTasksByProject } from "@/db/tasks";
import type { Db } from "@/db/types";
import type { Column, Project, Task } from "@/types/domain";

export interface InitialBoard {
  projects: Project[];
  currentProjectId: string | null;
  columns: Column[];
  tasks: Task[];
}

export async function loadInitialBoard(db: Db): Promise<InitialBoard> {
  const projects = await listProjects(db);
  const first = projects[0];
  if (!first) {
    return { projects: [], currentProjectId: null, columns: [], tasks: [] };
  }
  const { columns, tasks } = await loadProjectData(db, first.id);
  return { projects, currentProjectId: first.id, columns, tasks };
}

export async function loadProjectData(
  db: Db,
  projectId: string,
): Promise<{ columns: Column[]; tasks: Task[] }> {
  const columns = await listColumns(db, projectId);
  const tasks = await listTasksByProject(db, projectId);
  return { columns, tasks };
}
