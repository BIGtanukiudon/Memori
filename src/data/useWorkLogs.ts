import { useCallback, useEffect, useState } from "react";
import { getDb } from "@/db/connection";
import { listWorkLogsByTask } from "@/db/workLogs";
import { createWorkLogAction, deleteWorkLogAction, updateWorkLogAction } from "./workLogActions";
import type { WorkLog } from "@/types/domain";

export interface UseWorkLogsResult {
  workLogs: WorkLog[];
  loading: boolean;
  addWorkLog: (body: string) => Promise<void>;
  updateWorkLog: (id: string, body: string) => Promise<void>;
  deleteWorkLog: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useWorkLogs(taskId: string | null): UseWorkLogsResult {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!taskId) {
      setWorkLogs([]);
      return;
    }
    setLoading(true);
    try {
      const db = await getDb();
      const logs = await listWorkLogsByTask(db, taskId);
      setWorkLogs(logs);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addWorkLog = useCallback(
    async (body: string) => {
      if (!taskId) return;
      const db = await getDb();
      await createWorkLogAction(db, { taskId, body });
      await reload();
    },
    [taskId, reload],
  );

  const updateWorkLog = useCallback(
    async (id: string, body: string) => {
      const db = await getDb();
      await updateWorkLogAction(db, id, body);
      await reload();
    },
    [reload],
  );

  const deleteWorkLog = useCallback(
    async (id: string) => {
      const db = await getDb();
      await deleteWorkLogAction(db, id);
      await reload();
    },
    [reload],
  );

  return { workLogs, loading, addWorkLog, updateWorkLog, deleteWorkLog, reload };
}
