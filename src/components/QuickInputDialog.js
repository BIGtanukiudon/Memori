import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Priority, parsePriority } from "@/lib/priority";
export function QuickInputDialog({ projects, loadColumns, onSubmit, onCancel, }) {
    const titleRef = useRef(null);
    const [title, setTitle] = useState("");
    const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
    const [columns, setColumns] = useState([]);
    const [columnId, setColumnId] = useState("");
    const [priority, setPriority] = useState(Priority.None);
    const [dueDate, setDueDate] = useState("");
    // プロジェクト変更時に列を再ロード
    useEffect(() => {
        if (!projectId) {
            setColumns([]);
            setColumnId("");
            return;
        }
        let cancelled = false;
        void (async () => {
            const cs = await loadColumns(projectId);
            if (cancelled)
                return;
            setColumns(cs);
            setColumnId(cs[0]?.id ?? "");
        })();
        return () => {
            cancelled = true;
        };
    }, [projectId, loadColumns]);
    // 初回フォーカス
    useEffect(() => {
        titleRef.current?.focus();
    }, []);
    // 親プロジェクト一覧が初期化遅延で渡ってきた場合に最初のIDを選択
    useEffect(() => {
        if (!projectId && projects[0]) {
            setProjectId(projects[0].id);
        }
    }, [projects, projectId]);
    const canSubmit = title.trim().length > 0 && projectId !== "" && columnId !== "";
    function submit() {
        if (!canSubmit)
            return;
        onSubmit({
            projectId,
            columnId,
            title: title.trim(),
            dueDate: dueDate.length > 0 ? dueDate : null,
            priority,
        });
    }
    function handleKey(e) {
        if (e.key === "Enter") {
            // textarea等では改行を許すべきだが、ここに textarea はない
            e.preventDefault();
            submit();
        }
        else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
        }
    }
    if (projects.length === 0) {
        return (_jsxs("div", { onKeyDown: handleKey, className: "flex h-full w-full flex-col items-center justify-center gap-2 bg-white p-4 text-sm text-gray-700", children: [_jsx("p", { children: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u304C\u3042\u308A\u307E\u305B\u3093" }), _jsx("p", { className: "text-xs text-gray-500", children: "\u30E1\u30A4\u30F3\u30A6\u30A3\u30F3\u30C9\u30A6\u304B\u3089\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044" }), _jsx("button", { type: "button", onClick: onCancel, className: "mt-2 rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100", children: "\u9589\u3058\u308B" })] }));
    }
    return (_jsxs("div", { onKeyDown: handleKey, className: "flex h-full w-full flex-col gap-2 bg-white p-3 text-sm", children: [_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-xs text-gray-600", children: "\u30BF\u30B9\u30AF\u540D" }), _jsx("input", { ref: titleRef, "aria-label": "\u30BF\u30B9\u30AF\u540D", value: title, onChange: (e) => setTitle(e.target.value), className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("label", { className: "flex flex-1 flex-col gap-1", children: [_jsx("span", { className: "text-xs text-gray-600", children: "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8" }), _jsx("select", { "aria-label": "\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8", value: projectId, onChange: (e) => setProjectId(e.target.value), className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500", children: projects.map((p) => (_jsx("option", { value: p.id, children: p.name }, p.id))) })] }), _jsxs("label", { className: "flex flex-1 flex-col gap-1", children: [_jsx("span", { className: "text-xs text-gray-600", children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsx("select", { "aria-label": "\u30B9\u30C6\u30FC\u30BF\u30B9", value: columnId, onChange: (e) => setColumnId(e.target.value), disabled: columns.length === 0, className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500", children: columns.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id))) })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("label", { className: "flex flex-1 flex-col gap-1", children: [_jsx("span", { className: "text-xs text-gray-600", children: "\u512A\u5148\u5EA6" }), _jsxs("select", { "aria-label": "\u512A\u5148\u5EA6", value: String(priority), onChange: (e) => setPriority(parsePriority(Number(e.target.value))), className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500", children: [_jsx("option", { value: String(Priority.None), children: "\u306A\u3057" }), _jsx("option", { value: String(Priority.Low), children: "\u4F4E" }), _jsx("option", { value: String(Priority.Medium), children: "\u4E2D" }), _jsx("option", { value: String(Priority.High), children: "\u9AD8" })] })] }), _jsxs("label", { className: "flex flex-1 flex-col gap-1", children: [_jsx("span", { className: "text-xs text-gray-600", children: "\u671F\u65E5" }), _jsx("input", { "aria-label": "\u671F\u65E5", type: "date", value: dueDate, onChange: (e) => setDueDate(e.target.value), className: "rounded border border-gray-300 px-2 py-1 outline-none focus:border-gray-500" })] })] }), _jsxs("div", { className: "mt-1 flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: onCancel, className: "rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100", children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx("button", { type: "button", disabled: !canSubmit, onClick: submit, className: "rounded bg-gray-900 px-3 py-1 text-xs text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400", children: "\u767B\u9332" })] })] }));
}
