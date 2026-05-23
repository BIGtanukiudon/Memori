import { useEffect } from "react";
import {
  listenProjectChanged,
  listenTaskCreated,
  listenTaskDeleted,
  listenTaskUpdated,
  type ProjectEventPayload,
  type TaskEventPayload,
} from "@/lib/events";

export type TaskEventKind = "created" | "updated" | "deleted";

export interface UseBoardSyncArgs {
  onTaskEvent: (kind: TaskEventKind, p: TaskEventPayload) => void;
  onProjectChanged: (p: ProjectEventPayload) => void;
}

export function useBoardSync({ onTaskEvent, onProjectChanged }: UseBoardSyncArgs): void {
  useEffect(() => {
    let cancelled = false;
    const unlisteners: Array<() => void> = [];

    function register(unlisten: () => void) {
      if (cancelled) {
        unlisten();
      } else {
        unlisteners.push(unlisten);
      }
    }

    void listenTaskCreated((p) => onTaskEvent("created", p)).then(register);
    void listenTaskUpdated((p) => onTaskEvent("updated", p)).then(register);
    void listenTaskDeleted((p) => onTaskEvent("deleted", p)).then(register);
    void listenProjectChanged(onProjectChanged).then(register);

    return () => {
      cancelled = true;
      for (const u of unlisteners) u();
    };
  }, [onTaskEvent, onProjectChanged]);
}
