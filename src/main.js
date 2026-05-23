import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { QuickApp } from "./QuickApp";
import { currentWindowLabel } from "@/lib/window";
import "./index.css";
async function bootstrap() {
    const label = await currentWindowLabel();
    const root = ReactDOM.createRoot(document.getElementById("root"));
    const view = label === "quick" ? _jsx(QuickApp, {}) : _jsx(App, {});
    root.render(_jsx(React.StrictMode, { children: view }));
}
void bootstrap();
