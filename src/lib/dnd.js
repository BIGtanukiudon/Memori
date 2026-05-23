export const COLUMN_DROPPABLE_PREFIX = "col-";
export function columnDroppableId(columnId) {
    return `${COLUMN_DROPPABLE_PREFIX}${columnId}`;
}
export function parseColumnDroppableId(id) {
    return id.startsWith(COLUMN_DROPPABLE_PREFIX)
        ? id.slice(COLUMN_DROPPABLE_PREFIX.length)
        : null;
}
export function computeTaskMove({ activeId, overId, tasks, }) {
    if (!overId || activeId === overId)
        return null;
    const active = tasks.find((t) => t.id === activeId);
    if (!active)
        return null;
    // 列ドロッパブル: 末尾に追加
    const colId = parseColumnDroppableId(overId);
    if (colId !== null) {
        const destLength = tasks.filter((t) => t.columnId === colId && t.id !== activeId).length;
        return { taskId: activeId, toColumnId: colId, toIndex: destLength };
    }
    // overId は別タスクのid
    const over = tasks.find((t) => t.id === overId);
    if (!over)
        return null;
    const destSorted = tasks
        .filter((t) => t.columnId === over.columnId)
        .sort((a, b) => a.position - b.position);
    const overIndex = destSorted.findIndex((t) => t.id === overId);
    return { taskId: activeId, toColumnId: over.columnId, toIndex: overIndex };
}
export function computeColumnReorder({ activeId, overId, orderedIds, }) {
    if (!overId || activeId === overId)
        return null;
    const oldIndex = orderedIds.indexOf(activeId);
    const newIndex = orderedIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1)
        return null;
    const next = [...orderedIds];
    next.splice(oldIndex, 1);
    next.splice(newIndex, 0, activeId);
    return next;
}
