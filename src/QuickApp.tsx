import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getDb } from "@/db/connection";
import { listProjects } from "@/db/projects";
import { listColumns } from "@/db/columns";
import { searchTasksForLog, type TaskSearchResult } from "@/db/tasks";
import { getLastLoggedTaskId } from "@/db/workLogs";
import { createTaskAction } from "@/data/taskActions";
import { createWorkLogAction } from "@/data/workLogActions";
import { emitTaskCreated, emitWorkLogAdded, listenQuickModeChanged, type QuickMode } from "@/lib/events";
import { hideQuickWindow, isTauriRuntime } from "@/lib/window";
import { QuickInputDialog, type QuickInputSubmit } from "@/components/QuickInputDialog";
import { QuickLogDialog, type QuickLogSubmit } from "@/components/QuickLogDialog";
import type { Project } from "@/types/domain";

async function fetchQuickMode(): Promise<QuickMode> {
  if (!isTauriRuntime()) return "task";
  const mode = await invoke<string>("get_quick_mode");
  return mode === "log" ? "log" : "task";
}

export function QuickApp() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [mode, setMode] = useState<QuickMode>("task");
  const [logFormKey, setLogFormKey] = useState(0);
  const [defaultLogTask, setDefaultLogTask] = useState<TaskSearchResult | null>(null);
  const [logReady, setLogReady] = useState(false);

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

  // どちらのモード（タスク追加/ログ追加）で開かれたかを判定する。
  // 起動直後はイベントのlisten登録が間に合わない可能性があるため、
  // マウント時に一度コマンドで現在値を取得し、以後はイベントで追随する。
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const initial = await fetchQuickMode();
      if (!cancelled) setMode(initial);
    })();
    const unlistenPromise = listenQuickModeChanged((p) => {
      setMode(p.mode);
      if (p.mode === "log") {
        // §3.2 quickウィンドウは使い回すため、再表示のたびにログフォームをリセットする
        setLogFormKey((k) => k + 1);
      }
    });
    return () => {
      cancelled = true;
      void unlistenPromise.then((u) => u());
    };
  }, []);

  // ログモードで開かれるたびに既定の対象タスクを解決する。
  // QuickLogDialogは内部stateの初期値をpropsから取るため、
  // 解決が終わるまでマウントを遅らせて古いinitialTaskで初期化されるのを防ぐ。
  useEffect(() => {
    if (mode !== "log") return;
    setLogReady(false);
    let cancelled = false;
    void (async () => {
      try {
        const db = await getDb();
        const [defaultId, candidates] = await Promise.all([
          getLastLoggedTaskId(db),
          searchTasksForLog(db, ""),
        ]);
        if (cancelled) return;
        setDefaultLogTask(defaultId ? (candidates.find((c) => c.id === defaultId) ?? null) : null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLogReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, logFormKey]);

  async function loadProjectColumns(projectId: string) {
    const db = await getDb();
    return listColumns(db, projectId);
  }

  async function searchTasks(query: string) {
    const db = await getDb();
    return searchTasksForLog(db, query);
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

  async function handleLogSubmit(input: QuickLogSubmit) {
    try {
      const db = await getDb();
      const log = await createWorkLogAction(db, { taskId: input.taskId, body: input.body });
      await emitWorkLogAdded({ taskId: log.taskId, projectId: log.projectId });
    } finally {
      await hideQuickWindow();
      setLogFormKey((k) => k + 1);
    }
  }

  async function handleLogCancel() {
    await hideQuickWindow();
    setLogFormKey((k) => k + 1);
  }

  return (
    <div className="h-full w-full">
      {error && <div className="bg-red-50 px-3 py-1 text-xs text-red-700">{error}</div>}
      {mode === "log" ? (
        logReady && (
          <QuickLogDialog
            key={logFormKey}
            initialTask={defaultLogTask}
            searchTasks={searchTasks}
            onSubmit={(i) => void handleLogSubmit(i)}
            onCancel={() => void handleLogCancel()}
          />
        )
      ) : (
        <QuickInputDialog
          key={formKey}
          projects={projects}
          loadColumns={loadProjectColumns}
          onSubmit={(i) => void handleSubmit(i)}
          onCancel={() => void handleCancel()}
        />
      )}
    </div>
  );
}
