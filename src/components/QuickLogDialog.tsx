import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { TaskSearchResult } from "@/db/tasks";

export interface QuickLogSubmit {
  taskId: string;
  body: string;
}

export interface QuickLogDialogProps {
  initialTask: TaskSearchResult | null;
  searchTasks: (query: string) => Promise<TaskSearchResult[]>;
  onSubmit: (input: QuickLogSubmit) => void;
  onCancel: () => void;
}

function formatTaskLabel(task: TaskSearchResult): string {
  return `${task.projectName} / ${task.title}`;
}

export function QuickLogDialog({
  initialTask,
  searchTasks,
  onSubmit,
  onCancel,
}: QuickLogDialogProps) {
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const taskInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedTask, setSelectedTask] = useState<TaskSearchResult | null>(initialTask);
  const [body, setBody] = useState("");
  const [taskQuery, setTaskQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<TaskSearchResult[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(0);

  // 初回フォーカス: 既定タスクが決まっていれば本文欄、決まらなければ対象タスク欄
  useEffect(() => {
    if (initialTask) {
      bodyRef.current?.focus();
    } else {
      taskInputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 検索中のみ、クエリに応じて候補を取得（空クエリ=直近ログ順）
  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    void (async () => {
      const results = await searchTasks(taskQuery);
      if (cancelled) return;
      setCandidates(results);
      setHighlightIndex(0);
    })();
    return () => {
      cancelled = true;
    };
  }, [searching, taskQuery, searchTasks]);

  const canSubmit = selectedTask !== null && body.trim().length > 0;

  function submit() {
    if (!canSubmit || !selectedTask) return;
    onSubmit({ taskId: selectedTask.id, body: body.trim() });
  }

  function closeSearch() {
    setSearching(false);
    setTaskQuery("");
    setCandidates([]);
  }

  function selectCandidate(task: TaskSearchResult) {
    setSelectedTask(task);
    closeSearch();
  }

  function handleContainerKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  function handleBodyKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  function handleTaskKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!searching) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, candidates.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const picked = candidates[highlightIndex];
      if (picked) {
        e.preventDefault();
        selectCandidate(picked);
      }
    }
  }

  const taskInputValue = searching
    ? taskQuery
    : selectedTask
      ? formatTaskLabel(selectedTask)
      : "";

  return (
    <div
      onKeyDown={handleContainerKeyDown}
      className="flex h-full w-full flex-col gap-2 bg-white p-3 text-sm"
    >
      <label className="relative flex flex-col gap-1">
        <span className="text-xs text-gray-600">対象タスク</span>
        <input
          ref={taskInputRef}
          aria-label="対象タスク"
          value={taskInputValue}
          placeholder="タスクを検索"
          onFocus={() => setSearching(true)}
          onBlur={closeSearch}
          onChange={(e) => {
            setSearching(true);
            setTaskQuery(e.target.value);
          }}
          onKeyDown={handleTaskKeyDown}
          className="rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500"
        />
        {searching && candidates.length > 0 && (
          <ul
            role="listbox"
            className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded border border-gray-300 bg-white text-sm shadow"
          >
            {candidates.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === highlightIndex}
                // onMouseDownでpreventDefaultし、input側のonBlurより先にクリックを確定させる
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectCandidate(c);
                }}
                className={`cursor-pointer px-2 py-1 ${
                  i === highlightIndex ? "bg-gray-100" : ""
                }`}
              >
                {formatTaskLabel(c)}
                {c.completedAt !== null && (
                  <span className="ml-1 text-xs text-gray-400">(完了)</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </label>

      <label className="flex flex-1 flex-col gap-1">
        <span className="text-xs text-gray-600">本文</span>
        <textarea
          ref={bodyRef}
          aria-label="本文"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleBodyKeyDown}
          rows={5}
          placeholder="作業内容を入力（Ctrl+Enterで追加）"
          className="flex-1 resize-none rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500"
        />
      </label>

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
          追加
        </button>
      </div>
    </div>
  );
}
