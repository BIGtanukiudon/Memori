const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function formatDueDate(iso) {
    if (!iso)
        return "";
    if (!ISO_DATE_RE.test(iso))
        return iso;
    return iso.replaceAll("-", "/");
}
export function todayIso(now = new Date()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
export function isOverdue(iso, now = new Date()) {
    if (!iso || !ISO_DATE_RE.test(iso))
        return false;
    return iso < todayIso(now);
}
function pad2(n) {
    return String(n).padStart(2, "0");
}
export function formatWorkLogTimestamp(iso, now = new Date()) {
    const d = new Date(iso);
    const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    const sameDay = d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
    if (sameDay)
        return hm;
    return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${hm}`;
}
