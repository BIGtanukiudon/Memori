import { useEffect, useState } from "react";
import type { Task } from "@/types/domain";
import { Priority, parsePriority } from "@/lib/priority";
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
}

export function TaskDetailDialog({
  open,
  task,
  onSave,
  onDelete,
  onClose,
}: TaskDetailDialogProps) {
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>(Priority.None);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setMemo(task.memo ?? "");
    setDueDate(task.dueDate ?? "");
    setPriority(task.priority);
    setConfirmDelete(false);
  }, [task]);

  if (!open || !task) return null;

  const titleValid = title.trim().length > 0;

  function handleSave() {
    if (!titleValid) return;
    onSave({
      title: title.trim(),
      memo: memo.length > 0 ? memo : null,
      dueDate: dueDate.length > 0 ? dueDate : null,
      priority,
    });
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
    </>
  );
}
