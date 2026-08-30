import { createWorkLog, deleteWorkLog, updateWorkLog, } from "@/db/workLogs";
export async function createWorkLogAction(db, input) {
    return createWorkLog(db, input);
}
export async function updateWorkLogAction(db, id, body) {
    await updateWorkLog(db, id, body);
}
export async function deleteWorkLogAction(db, id) {
    await deleteWorkLog(db, id);
}
