import { useState, type KeyboardEvent } from "react";
import { useBoardStore } from "@/store/boardStore";
import { getDb } from "@/db/connection";
import {
  countTasksInProject,
  createProjectAction,
  deleteProjectAction,
  renameProjectAction,
  reorderProjectsAction,
} from "@/data/projectActions";
import { ConfirmDialog } from "./ConfirmDialog";

interface DeleteState {
  id: string;
  name: string;
  taskCount: number;
}

export type SidebarView = "board" | "all";

export interface SidebarProps {
  view?: SidebarView;
  onSelectView?: (view: SidebarView) => void;
}

export function Sidebar({ view = "board", onSelectView }: SidebarProps = {}) {
  const projects = useBoardStore((s) => s.projects);
  const currentProjectId = useBoardStore((s) => s.currentProjectId);
  const setCurrentProject = useBoardStore((s) => s.setCurrentProject);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) {
      setCreating(false);
      return;
    }
    const db = await getDb();
    await createProjectAction(db, name);
    setNewName("");
    setCreating(false);
  }

  function handleCreateKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleCreate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setCreating(false);
      setNewName("");
    }
  }

  async function handleRename(id: string) {
    const name = editingName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    const db = await getDb();
    await renameProjectAction(db, id, name);
    setEditingId(null);
  }

  function handleRenameKey(e: KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleRename(id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingId(null);
    }
  }

  async function openDelete(id: string, name: string) {
    const db = await getDb();
    const count = await countTasksInProject(db, id);
    setDeleteState({ id, name, taskCount: count });
  }

  async function confirmDelete() {
    if (!deleteState) return;
    const db = await getDb();
    await deleteProjectAction(db, deleteState.id);
    setDeleteState(null);
  }

  const sortedProjects = [...projects].sort((a, b) => a.position - b.position);

  async function handleMoveUp(index: number) {
    if (index <= 0) return;
    const ids = sortedProjects.map((p) => p.id);
    [ids[index - 1], ids[index]] = [ids[index]!, ids[index - 1]!];
    const db = await getDb();
    await reorderProjectsAction(db, ids);
  }

  async function handleMoveDown(index: number) {
    if (index >= sortedProjects.length - 1) return;
    const ids = sortedProjects.map((p) => p.id);
    [ids[index], ids[index + 1]] = [ids[index + 1]!, ids[index]!];
    const db = await getDb();
    await reorderProjectsAction(db, ids);
  }

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      <nav className="flex flex-col border-b border-gray-200">
        <button
          type="button"
          aria-current={view === "all"}
          onClick={() => onSelectView?.("all")}
          className={`px-3 py-2 text-left text-sm hover:bg-gray-100 ${
            view === "all" ? "bg-gray-100 font-medium text-gray-900" : "text-gray-700"
          }`}
        >
          全タスク
        </button>
      </nav>
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <span className="text-xs font-semibold text-gray-500">プロジェクト</span>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setNewName("");
          }}
          aria-label="新規プロジェクト"
          className="rounded px-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          ＋
        </button>
      </div>

      {creating && (
        <div className="border-b border-gray-100 px-2 py-1">
          <input
            autoFocus
            value={newName}
            placeholder="プロジェクト名"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleCreateKey}
            onBlur={() => void handleCreate()}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500"
          />
        </div>
      )}

      {projects.length === 0 && !creating ? (
        <div className="px-3 py-4 text-sm text-gray-500">プロジェクトがありません</div>
      ) : (
        <nav className="flex flex-col">
          {sortedProjects.map((p, idx) => {
            const active = p.id === currentProjectId;
            const isEditing = editingId === p.id;
            const isFirst = idx === 0;
            const isLast = idx === sortedProjects.length - 1;
            return (
              <div key={p.id} className="group flex items-center">
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => handleRenameKey(e, p.id)}
                    onBlur={() => void handleRename(p.id)}
                    className="m-1 flex-1 rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500"
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      aria-current={active && view === "board"}
                      onClick={() => {
                        setCurrentProject(p.id);
                        onSelectView?.("board");
                      }}
                      className={`flex-1 truncate px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                        active && view === "board"
                          ? "bg-gray-100 font-medium text-gray-900"
                          : "text-gray-700"
                      }`}
                    >
                      {p.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`${p.name}を上へ`}
                      disabled={isFirst}
                      onClick={() => void handleMoveUp(idx)}
                      className="px-0.5 text-xs text-gray-400 opacity-0 hover:text-gray-700 group-hover:opacity-100 disabled:opacity-30 disabled:hover:text-gray-400"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label={`${p.name}を下へ`}
                      disabled={isLast}
                      onClick={() => void handleMoveDown(idx)}
                      className="px-0.5 text-xs text-gray-400 opacity-0 hover:text-gray-700 group-hover:opacity-100 disabled:opacity-30 disabled:hover:text-gray-400"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      aria-label={`${p.name}を編集`}
                      onClick={() => {
                        setEditingId(p.id);
                        setEditingName(p.name);
                      }}
                      className="px-0.5 text-xs text-gray-400 opacity-0 hover:text-gray-700 group-hover:opacity-100"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      aria-label={`${p.name}を削除`}
                      onClick={() => void openDelete(p.id, p.name)}
                      className="px-0.5 pr-2 text-xs text-gray-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </nav>
      )}

      <ConfirmDialog
        open={!!deleteState}
        title="プロジェクトを削除"
        destructive
        confirmLabel="削除"
        message={
          deleteState && (
            <>
              プロジェクト「{deleteState.name}」と配下の
              <strong className="px-1">{deleteState.taskCount}</strong>
              件のタスクを削除します。この操作は取り消せません。
            </>
          )
        }
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteState(null)}
      />
    </aside>
  );
}
