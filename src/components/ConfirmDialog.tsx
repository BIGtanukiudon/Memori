import type { ReactNode } from "react";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClass = destructive
    ? "bg-red-600 text-white hover:bg-red-700"
    : "bg-gray-900 text-white hover:bg-gray-800";

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="text-sm text-gray-700">{message}</div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded px-3 py-1 text-sm ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
