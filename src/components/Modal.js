import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
export function Modal({ open, title, onClose, children }) {
    useEffect(() => {
        if (!open)
            return;
        function onKey(e) {
            if (e.key === "Escape")
                onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsx("div", { "data-testid": "modal-overlay", className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40", onClick: onClose, children: _jsxs("div", { role: "dialog", "aria-label": title, className: "w-[min(420px,90vw)] rounded-lg bg-white p-4 shadow-xl", onClick: (e) => e.stopPropagation(), children: [_jsx("h2", { className: "mb-3 text-base font-semibold text-gray-900", children: title }), _jsx("div", { children: children })] }) }));
}
