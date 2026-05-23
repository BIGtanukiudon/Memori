import { useCallback, useEffect, useState } from "react";
import { getDb } from "@/db/connection";
import { listProjects } from "@/db/projects";
import { listAllColumns } from "@/db/columns";
import { listTasks } from "@/db/tasks";
import { loadProjectData } from "@/data/loadBoard";
import { useBoardStore } from "@/store/boardStore";
import { useBoardSync } from "@/data/useBoardSync";
import {
  deleteTaskAction,
  updateTaskAction,
} from "@/data/taskActions";
import { Sidebar } from "@/components/Sidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AllTasksView } from "@/components/AllTasksView";
import { TaskDetailDialog, type TaskDetailPatch } from "@/components/TaskDetailDialog";
import { isTauriRuntime } from "@/lib/window";
import type { Column, Task } from "@/types/domain";

type View = "board" | "all";

export function App() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("board");

  const projects = useBoardStore((s) => s.projects);
  const currentProjectId = useBoardStore((s) => s.currentProjectId);
  const setProjects = useBoardStore((s) => s.setProjects);
  const setCurrentProject = useBoardStore((s) => s.setCurrentProject);
  const setColumns = useBoardStore((s) => s.setColumns);
  const setTasks = useBoardStore((s) => s.setTasks);

  // 全タスクビュー用データ
  const [allColumns, setAllColumns] = useState<Column[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allEditingTaskId, setAllEditingTaskId] = useState<string | null>(null);
  const allEditingTask = allTasks.find((t) => t.id === allEditingTaskId) ?? null;

  // 初回: プロジェクト一覧を取得、最初のプロジェクトを選択
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await getDb();
        const ps = await listProjects(db);
        if (cancelled) return;
        setProjects(ps);
        if (ps.length > 0 && !useBoardStore.getState().currentProjectId) {
          setCurrentProject(ps[0]!.id);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setProjects, setCurrentProject]);

  const refetchCurrentProject = useCallback(async () => {
    const id = useBoardStore.getState().currentProjectId;
    if (!id) return;
    try {
      const db = await getDb();
      const { columns, tasks } = await loadProjectData(db, id);
      setColumns(columns);
      setTasks(tasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [setColumns, setTasks]);

  const refetchAllTasks = useCallback(async () => {
    try {
      const db = await getDb();
      const [cols, ts] = await Promise.all([listAllColumns(db), listTasks(db)]);
      setAllColumns(cols);
      setAllTasks(ts);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // currentProjectIdの変化に応じて列とタスクを取得
  useEffect(() => {
    if (!currentProjectId) {
      setColumns([]);
      setTasks([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const db = await getDb();
        const { columns, tasks } = await loadProjectData(db, currentProjectId);
        if (cancelled) return;
        setColumns(columns);
        setTasks(tasks);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentProjectId, setColumns, setTasks]);

  // 全タスクビューに切り替わったらロード
  useEffect(() => {
    if (view !== "all") return;
    void refetchAllTasks();
  }, [view, refetchAllTasks]);

  // 他ウィンドウからのイベントを受信してストアを同期
  const onTaskEvent = useCallback(
    (_kind: "created" | "updated" | "deleted", p: { projectId: string }) => {
      if (p.projectId === useBoardStore.getState().currentProjectId) {
        void refetchCurrentProject();
      }
      if (view === "all") {
        void refetchAllTasks();
      }
    },
    [refetchCurrentProject, refetchAllTasks, view],
  );
  const onProjectChanged = useCallback(() => {
    void refetchCurrentProject();
    if (view === "all") void refetchAllTasks();
  }, [refetchCurrentProject, refetchAllTasks, view]);
  useBoardSync({ onTaskEvent, onProjectChanged });

  // §3.4 補助動線: メインウィンドウのフォーカス復帰時に再フェッチ
  useEffect(() => {
    function onFocus() {
      void refetchCurrentProject();
      if (view === "all") void refetchAllTasks();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetchCurrentProject, refetchAllTasks, view]);

  // 全タスクビューでのタスク詳細編集
  async function handleAllSave(patch: TaskDetailPatch) {
    if (!allEditingTaskId) return;
    const db = await getDb();
    await updateTaskAction(db, allEditingTaskId, patch);
    await refetchAllTasks();
    setAllEditingTaskId(null);
  }
  async function handleAllDelete() {
    if (!allEditingTaskId) return;
    const db = await getDb();
    await deleteTaskAction(db, allEditingTaskId);
    await refetchAllTasks();
    setAllEditingTaskId(null);
  }

  const tauri = isTauriRuntime();

  return (
    <div className="flex h-full w-full flex-col bg-gray-50 text-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold">Memori</h1>
          <span className="text-xs text-gray-500">
            {projects.length}件のプロジェクト
          </span>
        </div>
        {loading && <span className="text-xs text-gray-500">読み込み中…</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </header>
      {!tauri && (
        <div className="bg-amber-50 px-4 py-2 text-xs text-amber-800">
          ブラウザモードで起動中です。DB機能はTauri環境でのみ動作します。デスクトップで使うには
          <code className="mx-1 rounded bg-amber-100 px-1">pnpm tauri dev</code>
          を実行してください。
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar view={view} onSelectView={setView} />
        <main className="flex-1 overflow-hidden">
          {view === "all" ? (
            <AllTasksView
              projects={projects}
              columns={allColumns}
              tasks={allTasks}
              onTaskClick={(t) => setAllEditingTaskId(t.id)}
            />
          ) : (
            <KanbanBoard />
          )}
        </main>
      </div>

      <TaskDetailDialog
        open={view === "all" && !!allEditingTask}
        task={allEditingTask}
        onSave={(patch) => void handleAllSave(patch)}
        onDelete={() => void handleAllDelete()}
        onClose={() => setAllEditingTaskId(null)}
      />
    </div>
  );
}
