import { useEffect, useState, type KeyboardEvent } from "react";
import type { Task, WorkLog } from "@/types/domain";
import { Priority, parsePriority } from "@/lib/priority";
import { formatWorkLogTimestamp } from "@/lib/date";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";

export interface TaskDetailPatch {
  title: string;
  memo: string | null;
  dueDate: string | null;
  priority: Priority;
}

export interface TaskDetailDialogProps {
  open: boolean;
  task: Task | null;
  onSave: (patch: TaskDetailPatch) => void;
  onDelete: () => void;
  onClose: () => void;
  workLogs: WorkLog[];
  onAddWorkLog: (body: string) => void;
  onUpdateWorkLog: (id: string, body: string) => void;
  onDeleteWorkLog: (id: string) => void;
}

export function TaskDetailDialog({
  open,
  task,
  onSave,
  onDelete,
  onClose,
  workLogs,
  onAddWorkLog,
  onUpdateWorkLog,
  onDeleteWorkLog,
}: TaskDetailDialogProps) {
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>(Priority.None);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newLogBody, setNewLogBody] = useState("");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogBody, setEditingLogBody] = useState("");
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setMemo(task.memo ?? "");
    setDueDate(task.dueDate ?? "");
    setPriority(task.priority);
    setConfirmDelete(false);
    setNewLogBody("");
    setEditingLogId(null);
    setConfirmDeleteLogId(null);
  }, [task]);

  if (!open || !task) return null;

  const titleValid = title.trim().length > 0;
  const newLogValid = newLogBody.trim().length > 0;
  const editingLogValid = editingLogBody.trim().length > 0;

  function handleSave() {
    if (!titleValid) return;
    onSave({
      title: title.trim(),
      memo: memo.length > 0 ? memo : null,
      dueDate: dueDate.length > 0 ? dueDate : null,
      priority,
    });
  }

  function handleAddWorkLog() {
    if (!newLogValid) return;
    onAddWorkLog(newLogBody.trim());
    setNewLogBody("");
  }

  function handleNewLogKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddWorkLog();
    }
  }

  function startEditLog(log: WorkLog) {
    setEditingLogId(log.id);
    setEditingLogBody(log.body);
  }

  function cancelEditLog() {
    setEditingLogId(null);
    setEditingLogBody("");
  }

  function saveEditLog() {
    if (!editingLogValid || !editingLogId) return;
    onUpdateWorkLog(editingLogId, editingLogBody.trim());
    setEditingLogId(null);
    setEditingLogBody("");
  }

  return (
    <>
      <Modal open={open && !confirmDelete} onClose={onClose} title="タスクの詳細">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-gray-600">タイトル</span>
            <input
              aria-label="タイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-gray-600">メモ</span>
            <textarea
              aria-label="メモ"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              className="rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500"
            />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-gray-600">期日</span>
              <input
                aria-label="期日"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-gray-600">優先度</span>
              <select
                aria-label="優先度"
                value={String(priority)}
                onChange={(e) => setPriority(parsePriority(Number(e.target.value)))}
                className="rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500"
              >
                <option value={String(Priority.None)}>なし</option>
                <option value={String(Priority.Low)}>低</option>
                <option value={String(Priority.Medium)}>中</option>
                <option value={String(Priority.High)}>高</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-3">
          <h3 className="text-xs font-medium text-gray-600">作業ログ</h3>
          <div className="mt-2 flex flex-col gap-1">
            <textarea
              aria-label="作業ログを追加"
              value={newLogBody}
              onChange={(e) => setNewLogBody(e.target.value)}
              onKeyDown={handleNewLogKeyDown}
              rows={2}
              placeholder="作業内容を入力（Ctrl+Enterで追加）"
              className="rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500"
            />
            <button
              type="button"
              disabled={!newLogValid}
              onClick={handleAddWorkLog}
              className="self-end rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              追加
            </button>
          </div>

          <ul className="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto">
            {workLogs.length === 0 && (
              <li className="text-sm text-gray-500">作業ログはまだありません</li>
            )}
            {workLogs.map((log) => (
              <li
                key={log.id}
                data-testid="worklog-item"
                className="rounded border border-gray-200 px-2 py-1 text-sm"
              >
                {editingLogId === log.id ? (
                  <div className="flex flex-col gap-1">
                    <textarea
                      aria-label="作業ログを編集"
                      value={editingLogBody}
                      onChange={(e) => setEditingLogBody(e.target.value)}
                      rows={2}
                      autoFocus
                      className="rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-gray-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditLog}
                        className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-100"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        disabled={!editingLogValid}
                        onClick={saveEditLog}
                        className="rounded bg-gray-900 px-2 py-0.5 text-xs text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-500">
                        {formatWorkLogTimestamp(log.createdAt)}
                      </div>
                      <div
                        data-testid={`worklog-body-${log.id}`}
                        className="whitespace-pre-wrap"
                      >
                        {log.body}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEditLog(log)}
                        className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-100"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        aria-label="作業ログを削除"
                        onClick={() => setConfirmDeleteLogId(log.id)}
                        className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex justify-between">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
          >
            削除
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
            >
              閉じる
            </button>
            <button
              type="button"
              disabled={!titleValid}
              onClick={handleSave}
              className="rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="タスクを削除"
        destructive
        confirmLabel="削除する"
        message={`「${task.title}」を削除します。この操作は取り消せません。`}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={confirmDeleteLogId !== null}
        title="作業ログを削除"
        destructive
        confirmLabel="削除する"
        message="この作業ログを削除します。この操作は取り消せません。"
        onConfirm={() => {
          if (confirmDeleteLogId) onDeleteWorkLog(confirmDeleteLogId);
          setConfirmDeleteLogId(null);
        }}
        onCancel={() => setConfirmDeleteLogId(null)}
      />
    </>
  );
}
