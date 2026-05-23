import Database from "@tauri-apps/plugin-sql";
import { isTauriRuntime } from "@/lib/window";

export const DB_URI = "sqlite:kanban.db";

let cached: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!isTauriRuntime()) {
    return Promise.reject(
      new Error(
        "Tauri環境ではないためDBに接続できません (ブラウザモードではDB機能は使えません)。`pnpm tauri dev` で起動してください。",
      ),
    );
  }
  if (!cached) {
    cached = Database.load(DB_URI);
  }
  return cached;
}

export function __resetDbCacheForTests(): void {
  cached = null;
}
