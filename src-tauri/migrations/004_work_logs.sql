-- 作業ログはタスク削除後も残す（日報の材料としての価値を優先するため）。
-- 他テーブルと異なり task_id / project_id に外部キー制約は意図的に張らない。
CREATE TABLE IF NOT EXISTS work_logs (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL,
  project_id   TEXT NOT NULL,
  body         TEXT NOT NULL,
  task_title   TEXT NOT NULL,
  project_name TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_logs_created ON work_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_work_logs_task    ON work_logs(task_id, created_at);
