import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { DndContext, PointerSensor, KeyboardSensor, closestCorners, useSensor, useSensors, } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, } from "@dnd-kit/sortable";
import { useBoardStore } from "@/store/boardStore";
import { selectCurrentProject, selectSortedColumns, selectTasksByColumn, } from "@/store/selectors";
import { getDb } from "@/db/connection";
import { countTasksInColumn, createColumnAction, deleteColumnCascadeAction, deleteColumnAfterMoveAction, renameColumnAction, reorderColumnsAction, } from "@/data/columnActions";
import { createTaskAction, deleteTaskAction, moveTaskAction, updateTaskAction, } from "@/data/taskActions";
import { setDoneColumnAction } from "@/data/projectActions";
import { useWorkLogs } from "@/data/useWorkLogs";
import { computeColumnReorder, computeTaskMove } from "@/lib/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { DeleteColumnDialog } from "./DeleteColumnDialog";
import { TaskDetailDialog } from "./TaskDetailDialog";
export function KanbanBoard() {
    const currentProject = useBoardStore(selectCurrentProject);
    const columns = useBoardStore(selectSortedColumns);
    const tasksByColumn = useBoardStore(selectTasksByColumn);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const editingTask = useBoardStore((s) => editingTaskId ? s.tasks.find((t) => t.id === editingTaskId) ?? null : null);
    const editingWorkLogs = useWorkLogs(editingTaskId);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
    if (!currentProject) {
        return (_jsx("div", { className: "flex h-full items-center justify-center text-sm text-gray-500", children: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044" }));
    }
    async function handleAddColumn() {
        const name = newName.trim();
        if (!name || !currentProject) {
            setAdding(false);
            setNewName("");
            return;
        }
        const db = await getDb();
        await createColumnAction(db, currentProject.id, name);
        setAdding(false);
        setNewName("");
    }
    function handleAddKey(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            void handleAddColumn();
        }
        else if (e.key === "Escape") {
            e.preventDefault();
            setAdding(false);
            setNewName("");
        }
    }
    async function handleRename(id, name) {
        const db = await getDb();
        await renameColumnAction(db, id, name);
    }
    async function handleRequestDelete(column) {
        const count = countTasksInColumn(column.id);
        if (count === 0) {
            const db = await getDb();
            await deleteColumnCascadeAction(db, column.id);
            return;
        }
        setDeleteTarget({ column, taskCount: count });
    }
    async function handleCascade() {
        if (!deleteTarget)
            return;
        const db = await getDb();
        await deleteColumnCascadeAction(db, deleteTarget.column.id);
        setDeleteTarget(null);
    }
    async function handleMoveAndDelete(destId) {
        if (!deleteTarget)
            return;
        const db = await getDb();
        await deleteColumnAfterMoveAction(db, deleteTarget.column.id, destId);
        setDeleteTarget(null);
    }
    async function handleAddTask(columnId, title) {
        if (!currentProject)
            return;
        const db = await getDb();
        await createTaskAction(db, {
            projectId: currentProject.id,
            columnId,
            title,
        });
    }
    async function handleSaveTask(patch) {
        if (!editingTaskId)
            return;
        const db = await getDb();
        await updateTaskAction(db, editingTaskId, patch);
        setEditingTaskId(null);
    }
    async function handleDeleteTask() {
        if (!editingTaskId)
            return;
        const db = await getDb();
        await deleteTaskAction(db, editingTaskId);
        setEditingTaskId(null);
    }
    async function handleSetDoneColumn(columnId) {
        if (!currentProject)
            return;
        const db = await getDb();
        await setDoneColumnAction(db, currentProject.id, columnId);
    }
    async function handleDragEnd(event) {
        const activeId = String(event.active.id);
        const overId = event.over ? String(event.over.id) : null;
        const activeType = event.active.data.current?.type;
        if (activeType === "column" && currentProject) {
            const ordered = useBoardStore
                .getState()
                .columns.slice()
                .sort((a, b) => a.position - b.position)
                .map((c) => c.id);
            const next = computeColumnReorder({ activeId, overId, orderedIds: ordered });
            if (!next)
                return;
            const db = await getDb();
            await reorderColumnsAction(db, currentProject.id, next);
            return;
        }
        const move = computeTaskMove({
            activeId,
            overId,
            tasks: useBoardStore.getState().tasks,
        });
        if (!move)
            return;
        const db = await getDb();
        await moveTaskAction(db, move);
    }
    return (_jsx(DndContext, { sensors: sensors, collisionDetection: closestCorners, onDragEnd: (e) => void handleDragEnd(e), children: _jsxs("div", { className: "flex h-full gap-4 overflow-x-auto p-4", children: [_jsx(SortableContext, { items: columns.map((c) => c.id), strategy: horizontalListSortingStrategy, children: columns.map((c) => (_jsx(KanbanColumn, { column: c, tasks: tasksByColumn.get(c.id) ?? [], onRename: (id, name) => void handleRename(id, name), onRequestDelete: (col) => void handleRequestDelete(col), onAddTask: (columnId, title) => void handleAddTask(columnId, title), onTaskClick: (t) => setEditingTaskId(t.id), isDoneColumn: currentProject?.doneColumnId === c.id, onSetDoneColumn: (id) => void handleSetDoneColumn(id), draggable: true }, c.id))) }), _jsx("div", { className: "w-72 shrink-0", children: adding ? (_jsx("input", { autoFocus: true, value: newName, placeholder: "\u5217\u540D", onChange: (e) => setNewName(e.target.value), onKeyDown: handleAddKey, onBlur: () => void handleAddColumn(), className: "w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-gray-500" })) : (_jsx("button", { type: "button", "aria-label": "\u5217\u3092\u8FFD\u52A0", onClick: () => {
                            setAdding(true);
                            setNewName("");
                        }, className: "w-full rounded-lg border border-dashed border-gray-300 bg-white/50 px-3 py-2 text-sm text-gray-500 hover:bg-white", children: "\uFF0B \u5217\u3092\u8FFD\u52A0" })) }), deleteTarget && (_jsx(DeleteColumnDialog, { open: true, column: deleteTarget.column, otherColumns: columns.filter((c) => c.id !== deleteTarget.column.id), taskCount: deleteTarget.taskCount, onCascade: () => void handleCascade(), onMoveAndDelete: (id) => void handleMoveAndDelete(id), onCancel: () => setDeleteTarget(null) })), _jsx(TaskDetailDialog, { open: !!editingTask, task: editingTask, onSave: (patch) => void handleSaveTask(patch), onDelete: () => void handleDeleteTask(), onClose: () => setEditingTaskId(null), workLogs: editingWorkLogs.workLogs, onAddWorkLog: (body) => void editingWorkLogs.addWorkLog(body), onUpdateWorkLog: (id, body) => void editingWorkLogs.updateWorkLog(id, body), onDeleteWorkLog: (id) => void editingWorkLogs.deleteWorkLog(id) })] }) }));
}
