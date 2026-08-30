import type { Db } from "@/db/types";
import {
  createWorkLog,
  deleteWorkLog,
  updateWorkLog,
  type CreateWorkLogInput,
} from "@/db/workLogs";
import type { WorkLog } from "@/types/domain";

export async function createWorkLogAction(db: Db, input: CreateWorkLogInput): Promise<WorkLog> {
  return createWorkLog(db, input);
}

export async function updateWorkLogAction(db: Db, id: string, body: string): Promise<void> {
  await updateWorkLog(db, id, body);
}

export async function deleteWorkLogAction(db: Db, id: string): Promise<void> {
  await deleteWorkLog(db, id);
}
