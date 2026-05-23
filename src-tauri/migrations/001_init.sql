-- 外部キー制約はSQLite接続ごとに有効化する必要がある
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS columns (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  column_id   TEXT NOT NULL REFERENCES columns(id)  ON DELETE CASCADE,
  title       TEXT NOT NULL,
  memo        TEXT,
  due_date    TEXT,
  priority    INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_columns_project ON columns(project_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_column    ON tasks(column_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_project   ON tasks(project_id);
