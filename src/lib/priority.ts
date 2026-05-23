export const Priority = {
  None: 0,
  Low: 1,
  Medium: 2,
  High: 3,
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

const LABELS: Record<Priority, string> = {
  [Priority.None]: "なし",
  [Priority.Low]: "低",
  [Priority.Medium]: "中",
  [Priority.High]: "高",
};

export function priorityLabel(p: Priority): string {
  return LABELS[p];
}

export function parsePriority(value: number): Priority {
  if (!Number.isInteger(value)) return Priority.None;
  if (value < 0 || value > 3) return Priority.None;
  return value as Priority;
}
