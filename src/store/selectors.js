export function selectCurrentProject(s) {
    if (!s.currentProjectId)
        return null;
    return s.projects.find((p) => p.id === s.currentProjectId) ?? null;
}
export function selectSortedColumns(s) {
    return [...s.columns].sort((a, b) => a.position - b.position);
}
export function selectTasksByColumn(s) {
    const map = new Map();
    for (const t of s.tasks) {
        const list = map.get(t.columnId) ?? [];
        list.push(t);
        map.set(t.columnId, list);
    }
    for (const [k, v] of map) {
        map.set(k, [...v].sort((a, b) => a.position - b.position));
    }
    return map;
}
