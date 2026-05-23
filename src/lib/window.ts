/**
 * Tauriウィンドウ制御のラッパ。テストでモックしやすいように分離。
 * ブラウザ環境(Vite単体)では Tauri API がロードできないため、no-op で動かす。
 */

export type WindowLabel = "main" | "quick" | "unknown";

/** Tauri ランタイム上で動作しているか判定する */
export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "__TAURI_INTERNALS__" in window || "__TAURI_IPC__" in window
  );
}

async function getTauriWindow() {
  if (!isTauriRuntime()) return null;
  try {
    const mod = await import("@tauri-apps/api/window");
    return mod.getCurrentWindow();
  } catch {
    return null;
  }
}

export async function currentWindowLabel(): Promise<WindowLabel> {
  const w = await getTauriWindow();
  if (!w) return "unknown";
  if (w.label === "main" || w.label === "quick") return w.label;
  return "unknown";
}

export async function hideQuickWindow(): Promise<void> {
  const w = await getTauriWindow();
  if (!w) return;
  await w.hide();
}

export async function showQuickWindow(): Promise<void> {
  const w = await getTauriWindow();
  if (!w) return;
  await w.show();
  await w.setFocus();
}
