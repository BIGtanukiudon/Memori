import { useState } from "react";
import type { Column } from "@/types/domain";
import { Modal } from "./Modal";

export interface DeleteColumnDialogProps {
  open: boolean;
  column: Column;
  otherColumns: Column[];
  taskCount: number;
  onCascade: () => void;
  onMoveAndDelete: (destColumnId: string) => void;
  onCancel: () => void;
}

export function DeleteColumnDialog({
  open,
  column,
  otherColumns,
  taskCount,
  onCascade,
  onMoveAndDelete,
  onCancel,
}: DeleteColumnDialogProps) {
  const [dest, setDest] = useState<string>(otherColumns[0]?.id ?? "");

  const canMove = otherColumns.length > 0 && dest !== "";

  return (
    <Modal open={open} onClose={onCancel} title="列を削除">
      <div className="text-sm text-gray-700">
        列「{column.name}」には<strong className="px-1">{taskCount}</strong>件のタスクがあります。
        どのように削除しますか?
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={onCascade}
          className="rounded border border-red-200 bg-red-50 px-3 py-2 text-left text-sm hover:bg-red-100"
        >
          <div className="font-medium text-red-700">この列とタスクをまとめて削除</div>
          <div className="text-xs text-red-600">配下のタスクも全て削除されます</div>
        </button>

        <div className="rounded border border-gray-200 px-3 py-2">
          <div className="mb-1 font-medium text-gray-800">他の列へタスクを移動してから削除</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-600">移動先</span>
            <select
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              disabled={otherColumns.length === 0}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
            >
              {otherColumns.length === 0 && <option value="">他の列がありません</option>}
              {otherColumns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!canMove}
              onClick={() => onMoveAndDelete(dest)}
              className="rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              移動して削除
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
        >
          キャンセル
        </button>
      </div>
    </Modal>
  );
}
