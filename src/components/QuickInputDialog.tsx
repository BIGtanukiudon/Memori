import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Priority, parsePriority } from "@/lib/priority";
import type { Column, Project } from "@/types/domain";

export interface QuickInputSubmit {
  projectId: string;
  columnId: string;
  title: string;
  dueDate: string | null;
  priority: Priority;
}

export interface QuickInputDialogProps {
  projects: Project[];
  loadColumns: (projectId: string) => Promise<Column[]>;
  onSubmit: (input: QuickInputSubmit) => void;
  onCancel: () => void;
}

export function QuickInputDialog({
  projects,
  loadColumns,
  onSubmit,
  onCancel,
}: QuickInputDialogProps) {
  const titleRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [columns, setColumns] = useState<Column[]>([]);
  const [columnId, setColumnId] = useState<string>("");
  const [priority, setPriority] = useState<Priority>(Priority.None);
  const [dueDate, setDueDate] = useState<string>("");

  // プロジェクト変更時に列を再ロード
  useEffect(() => {
    if (!projectId) {
      setColumns([]);
      setColumnId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      const cs = await loadColumns(projectId);
      if (cancelled) return;
      setColumns(cs);
      setColumnId(cs[0]?.id ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, loadColumns]);

  // 初回フォーカス
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // 親プロジェクト一覧が初期化遅延で渡ってきた場合に最初のIDを選択
  useEffect(() => {
    if (!projectId && projects[0]) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  const canSubmit =
    title.trim().length > 0 && projectId !== "" && columnId !== "";

  function submit() {
    if (!canSubmit) return;
    onSubmit({
      projectId,
      columnId,
      title: title.trim(),
      dueDate: dueDate.length > 0 ? dueDate : null,
      priority,
    });
  }

  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter") {
      // textarea等では改行を許すべきだが、ここに textarea はない
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  if (projects.length === 0) {
    return (
      <div
        onKeyDown={handleKey}
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white p-4 text-sm text-gray-700"
      >
        <p>プロジェクトがありません</p>
        <p className="text-xs text-gray-500">メインウィンドウから作成してください</p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100"
        >
          閉じる
        </button>
      </div>
    );
  }

  return (
    <div
      onKeyDown={handleKey}
      className="flex h-full w-full flex-col gap-2 bg-white p-3 text-sm"
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">タスク名</span>
        <input
          ref={titleRef}
          aria-label="タスク名"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500"
        />
      </label>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-gray-600">プロジェクト</span>
          <select
            aria-label="プロジェクト"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-gray-600">ステータス</span>
          <select
            aria-label="ステータス"
            value={columnId}
            onChange={(e) => setColumnId(e.target.value)}
            disabled={columns.length === 0}
            className="rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500"
          >
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-gray-600">優先度</span>
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
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-gray-600">期日</span>
          <input
            aria-label="期日"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500"
          />
        </label>
      </div>

      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100"
        >
          キャンセル
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="rounded bg-gray-900 px-3 py-1 text-xs text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          登録
        </button>
      </div>
    </div>
  );
}
