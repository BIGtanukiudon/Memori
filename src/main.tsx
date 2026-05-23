import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { QuickApp } from "./QuickApp";
import { currentWindowLabel } from "@/lib/window";
import "./index.css";

async function bootstrap() {
  const label = await currentWindowLabel();
  const root = ReactDOM.createRoot(document.getElementById("root")!);
  const view = label === "quick" ? <QuickApp /> : <App />;
  root.render(<React.StrictMode>{view}</React.StrictMode>);
}

void bootstrap();
