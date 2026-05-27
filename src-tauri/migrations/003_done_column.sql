ALTER TABLE projects ADD COLUMN done_column_id TEXT REFERENCES columns(id) ON DELETE SET NULL;

ALTER TABLE tasks ADD COLUMN completed_at TEXT;
