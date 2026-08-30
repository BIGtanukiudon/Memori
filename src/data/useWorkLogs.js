import { useCallback, useEffect, useState } from "react";
import { getDb } from "@/db/connection";
import { listWorkLogsByTask } from "@/db/workLogs";
import { createWorkLogAction, deleteWorkLogAction, updateWorkLogAction } from "./workLogActions";
export function useWorkLogs(taskId) {
    const [workLogs, setWorkLogs] = useState([]);
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
        }
        finally {
            setLoading(false);
        }
    }, [taskId]);
    useEffect(() => {
        void reload();
    }, [reload]);
    const addWorkLog = useCallback(async (body) => {
        if (!taskId)
            return;
        const db = await getDb();
        await createWorkLogAction(db, { taskId, body });
        await reload();
    }, [taskId, reload]);
    const updateWorkLog = useCallback(async (id, body) => {
        const db = await getDb();
        await updateWorkLogAction(db, id, body);
        await reload();
    }, [reload]);
    const deleteWorkLog = useCallback(async (id) => {
        const db = await getDb();
        await deleteWorkLogAction(db, id);
        await reload();
    }, [reload]);
    return { workLogs, loading, addWorkLog, updateWorkLog, deleteWorkLog, reload };
}
