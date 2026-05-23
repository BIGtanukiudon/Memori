import { useEffect, useState } from "react";
import { getDb } from "@/db/connection";
import { listProjects } from "@/db/projects";
import { listColumns } from "@/db/columns";
import { createTaskAction } from "@/data/taskActions";
import { emitTaskCreated } from "@/lib/events";
import { hideQuickWindow } from "@/lib/window";
import { QuickInputDialog, type QuickInputSubmit } from "@/components/QuickInputDialog";
import type { Project } from "@/types/domain";

export function QuickApp() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const db = await getDb();
        const ps = await listProjects(db);
        if (!cancelled) setProjects(ps);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadProjectColumns(projectId: string) {
    const db = await getDb();
    return listColumns(db, projectId);
  }

  async function handleSubmit(input: QuickInputSubmit) {
    try {
      const db = await getDb();
      const task = await createTaskAction(db, {
        projectId: input.projectId,
        columnId: input.columnId,
        title: input.title,
        dueDate: input.dueDate,
        priority: input.priority,
      });
      await emitTaskCreated({ taskId: task.id, projectId: task.projectId });
    } finally {
      await hideQuickWindow();
      // §3.2: 入力フォームの内部状態をリセット
      setFormKey((k) => k + 1);
    }
  }

  async function handleCancel() {
    await hideQuickWindow();
    setFormKey((k) => k + 1);
  }

  return (
    <div className="h-full w-full">
      {error && <div className="bg-red-50 px-3 py-1 text-xs text-red-700">{error}</div>}
      <QuickInputDialog
        key={formKey}
        projects={projects}
        loadColumns={loadProjectColumns}
        onSubmit={(i) => void handleSubmit(i)}
        onCancel={() => void handleCancel()}
      />
    </div>
  );
}
