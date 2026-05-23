export const Priority = {
    None: 0,
    Low: 1,
    Medium: 2,
    High: 3,
};
const LABELS = {
    [Priority.None]: "なし",
    [Priority.Low]: "低",
    [Priority.Medium]: "中",
    [Priority.High]: "高",
};
export function priorityLabel(p) {
    return LABELS[p];
}
export function parsePriority(value) {
    if (!Number.isInteger(value))
        return Priority.None;
    if (value < 0 || value > 3)
        return Priority.None;
    return value;
}
