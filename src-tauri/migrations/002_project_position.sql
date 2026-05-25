ALTER TABLE projects ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

-- 既存データはcreated_at昇順でpositionを振り直す
UPDATE projects SET position = (
  SELECT COUNT(*) FROM projects p2 WHERE p2.created_at < projects.created_at
);
