import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { getDb } from "@/db/connection";
import { listProjects } from "@/db/projects";
import { listAllColumns } from "@/db/columns";
import { listTasks } from "@/db/tasks";
import { loadProjectData } from "@/data/loadBoard";
import { useBoardStore } from "@/store/boardStore";
import { useBoardSync } from "@/data/useBoardSync";
import { deleteTaskAction, updateTaskAction, } from "@/data/taskActions";
import { Sidebar } from "@/components/Sidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AllTasksView } from "@/components/AllTasksView";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { useWorkLogs } from "@/data/useWorkLogs";
import { isTauriRuntime } from "@/lib/window";
export function App() {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("board");
    const projects = useBoardStore((s) => s.projects);
    const currentProjectId = useBoardStore((s) => s.currentProjectId);
    const setProjects = useBoardStore((s) => s.setProjects);
    const setCurrentProject = useBoardStore((s) => s.setCurrentProject);
    const setColumns = useBoardStore((s) => s.setColumns);
    const setTasks = useBoardStore((s) => s.setTasks);
    // 全タスクビュー用データ
    const [allColumns, setAllColumns] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [allEditingTaskId, setAllEditingTaskId] = useState(null);
    const allEditingTask = allTasks.find((t) => t.id === allEditingTaskId) ?? null;
    const allEditingWorkLogs = useWorkLogs(allEditingTaskId);
    // 初回: プロジェクト一覧を取得、最初のプロジェクトを選択
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const db = await getDb();
                const ps = await listProjects(db);
                if (cancelled)
                    return;
                setProjects(ps);
                if (ps.length > 0 && !useBoardStore.getState().currentProjectId) {
                    setCurrentProject(ps[0].id);
                }
            }
            catch (e) {
                if (!cancelled)
                    setError(e instanceof Error ? e.message : String(e));
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [setProjects, setCurrentProject]);
    const refetchCurrentProject = useCallback(async () => {
        const id = useBoardStore.getState().currentProjectId;
        if (!id)
            return;
        try {
            const db = await getDb();
            const { columns, tasks } = await loadProjectData(db, id);
            setColumns(columns);
            setTasks(tasks);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [setColumns, setTasks]);
    const refetchAllTasks = useCallback(async () => {
        try {
            const db = await getDb();
            const [cols, ts] = await Promise.all([listAllColumns(db), listTasks(db)]);
            setAllColumns(cols);
            setAllTasks(ts);
        }
        catch (e) {
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
                if (cancelled)
                    return;
                setColumns(columns);
                setTasks(tasks);
            }
            catch (e) {
                if (!cancelled)
                    setError(e instanceof Error ? e.message : String(e));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [currentProjectId, setColumns, setTasks]);
    // 全タスクビューに切り替わったらロード
    useEffect(() => {
        if (view !== "all")
            return;
        void refetchAllTasks();
    }, [view, refetchAllTasks]);
    // 他ウィンドウからのイベントを受信してストアを同期
    const onTaskEvent = useCallback((_kind, p) => {
        if (p.projectId === useBoardStore.getState().currentProjectId) {
            void refetchCurrentProject();
        }
        if (view === "all") {
            void refetchAllTasks();
        }
    }, [refetchCurrentProject, refetchAllTasks, view]);
    const onProjectChanged = useCallback(() => {
        void refetchCurrentProject();
        if (view === "all")
            void refetchAllTasks();
    }, [refetchCurrentProject, refetchAllTasks, view]);
    useBoardSync({ onTaskEvent, onProjectChanged });
    // §3.4 補助動線: メインウィンドウのフォーカス復帰時に再フェッチ
    useEffect(() => {
        function onFocus() {
            void refetchCurrentProject();
            if (view === "all")
                void refetchAllTasks();
        }
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [refetchCurrentProject, refetchAllTasks, view]);
    // 全タスクビューでのタスク詳細編集
    async function handleAllSave(patch) {
        if (!allEditingTaskId)
            return;
        const db = await getDb();
        await updateTaskAction(db, allEditingTaskId, patch);
        await refetchAllTasks();
        setAllEditingTaskId(null);
    }
    async function handleAllDelete() {
        if (!allEditingTaskId)
            return;
        const db = await getDb();
        await deleteTaskAction(db, allEditingTaskId);
        await refetchAllTasks();
        setAllEditingTaskId(null);
    }
    const tauri = isTauriRuntime();
    return (_jsxs("div", { className: "flex h-full w-full flex-col bg-gray-50 text-gray-900", children: [_jsxs("header", { className: "flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h1", { className: "text-base font-semibold", children: "Memori" }), _jsxs("span", { className: "text-xs text-gray-500", children: [projects.length, "\u4EF6\u306E\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8"] })] }), loading && _jsx("span", { className: "text-xs text-gray-500", children: "\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026" }), error && _jsx("span", { className: "text-xs text-red-600", children: error })] }), !tauri && (_jsxs("div", { className: "bg-amber-50 px-4 py-2 text-xs text-amber-800", children: ["\u30D6\u30E9\u30A6\u30B6\u30E2\u30FC\u30C9\u3067\u8D77\u52D5\u4E2D\u3067\u3059\u3002DB\u6A5F\u80FD\u306FTauri\u74B0\u5883\u3067\u306E\u307F\u52D5\u4F5C\u3057\u307E\u3059\u3002\u30C7\u30B9\u30AF\u30C8\u30C3\u30D7\u3067\u4F7F\u3046\u306B\u306F", _jsx("code", { className: "mx-1 rounded bg-amber-100 px-1", children: "pnpm tauri dev" }), "\u3092\u5B9F\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002"] })), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsx(Sidebar, { view: view, onSelectView: setView }), _jsx("main", { className: "flex-1 overflow-hidden", children: view === "all" ? (_jsx(AllTasksView, { projects: projects, columns: allColumns, tasks: allTasks, onTaskClick: (t) => setAllEditingTaskId(t.id) })) : (_jsx(KanbanBoard, {})) })] }), _jsx(TaskDetailDialog, { open: view === "all" && !!allEditingTask, task: allEditingTask, onSave: (patch) => void handleAllSave(patch), onDelete: () => void handleAllDelete(), onClose: () => setAllEditingTaskId(null), workLogs: allEditingWorkLogs.workLogs, onAddWorkLog: (body) => void allEditingWorkLogs.addWorkLog(body), onUpdateWorkLog: (id, body) => void allEditingWorkLogs.updateWorkLog(id, body), onDeleteWorkLog: (id) => void allEditingWorkLogs.deleteWorkLog(id) })] }));
}
