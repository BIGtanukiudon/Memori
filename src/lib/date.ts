const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function formatDueDate(iso: string | null | undefined): string {
  if (!iso) return "";
  if (!ISO_DATE_RE.test(iso)) return iso;
  return iso.replaceAll("-", "/");
}

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isOverdue(iso: string | null | undefined, now: Date = new Date()): boolean {
  if (!iso || !ISO_DATE_RE.test(iso)) return false;
  return iso < todayIso(now);
}
