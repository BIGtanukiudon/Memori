//! CLI用 SQLite アクセス (Step 9 / spec §7).
//!
//! GUI側 (tauri-plugin-sql) と同じDBファイルを直接読み書きする。
//! 仕様§3.4 のとおり CLI 経由の更新ではウィンドウ間イベントが飛ばないため、
//! メインウィンドウ側はフォーカス復帰時に再フェッチして同期する。

use std::path::{Path, PathBuf};

use chrono::SecondsFormat;
use rusqlite::{params, Connection, OptionalExtension};
use ulid::Ulid;

use super::output::{ProjectListRow, TaskListRow};

const APP_IDENTIFIER: &str = "com.memori.app";
const DB_FILENAME: &str = "kanban.db";

/// tauri-plugin-sql 既定の保存先 (`<app_config_dir>/<identifier>/kanban.db`) を再現する。
/// CLIモードでも GUI と同じファイルを参照する必要がある。
pub fn default_db_path() -> Result<PathBuf, String> {
    let base = dirs::config_dir()
        .ok_or_else(|| "ユーザー設定ディレクトリを解決できません".to_string())?;
    Ok(base.join(APP_IDENTIFIER).join(DB_FILENAME))
}

/// DBを開く。親ディレクトリが無ければ作成。FK制約を必ず有効化する。
pub fn open_db(path: &Path) -> Result<Connection, String> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|e| format!("DB親ディレクトリ作成失敗: {e}"))?;
        }
    }
    let conn = Connection::open(path).map_err(|e| format!("DBオープン失敗: {e}"))?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| format!("FK有効化失敗: {e}"))?;
    Ok(conn)
}

/// テスト用のスキーマ初期化。GUI側のマイグレーション結果と同等のテーブルを用意する。
/// 本番 (`open_db`) では tauri-plugin-sql のマイグレーション後を想定するので呼ばない。
pub fn init_schema_for_test(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(include_str!("../../migrations/001_init.sql"))
        .map_err(|e| format!("スキーマ初期化失敗: {e}"))?;
    conn.execute_batch(include_str!("../../migrations/002_project_position.sql"))
        .map_err(|e| format!("マイグレーション002失敗: {e}"))?;
    conn.execute_batch(include_str!("../../migrations/003_done_column.sql"))
        .map_err(|e| format!("マイグレーション003失敗: {e}"))
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn new_ulid() -> String {
    Ulid::new().to_string()
}

fn find_project_id(conn: &Connection, name: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT id FROM projects WHERE name = ? LIMIT 1",
        params![name],
        |r| r.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| format!("プロジェクト検索失敗: {e}"))?
    .ok_or_else(|| format!("プロジェクトが見つかりません: {name}"))
}

fn find_column_id(conn: &Connection, project_id: &str, name: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT id FROM columns WHERE project_id = ? AND name = ? LIMIT 1",
        params![project_id, name],
        |r| r.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| format!("列検索失敗: {e}"))?
    .ok_or_else(|| format!("列が見つかりません: {name}"))
}

fn next_task_position(conn: &Connection, column_id: &str) -> Result<i64, String> {
    conn.query_row(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM tasks WHERE column_id = ?",
        params![column_id],
        |r| r.get::<_, i64>(0),
    )
    .map_err(|e| format!("position取得失敗: {e}"))
}

#[derive(Debug, Clone)]
pub struct AddInput<'a> {
    pub project: &'a str,
    pub status: &'a str,
    pub title: &'a str,
    pub memo: Option<&'a str>,
    pub due: Option<&'a str>,
    pub priority: Option<u8>,
}

#[derive(Debug, Clone)]
pub struct AddResult {
    pub id: String,
    pub project_name: String,
    pub column_name: String,
}

pub fn add_task(conn: &Connection, input: AddInput<'_>) -> Result<AddResult, String> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err("タイトルは必須です".into());
    }
    let project_id = find_project_id(conn, input.project)?;
    let column_id = find_column_id(conn, &project_id, input.status)?;
    let pos = next_task_position(conn, &column_id)?;
    let id = new_ulid();
    let ts = now_iso();
    let priority = input.priority.unwrap_or(0);

    conn.execute(
        "INSERT INTO tasks (id, project_id, column_id, title, memo, due_date, priority, position, created_at, updated_at)\
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, project_id, column_id, title, input.memo, input.due, priority, pos, ts, ts],
    )
    .map_err(|e| format!("タスク作成失敗: {e}"))?;

    Ok(AddResult {
        id,
        project_name: input.project.to_string(),
        column_name: input.status.to_string(),
    })
}

#[derive(Debug, Clone, Default)]
pub struct ListFilter<'a> {
    pub project: Option<&'a str>,
    pub status: Option<&'a str>,
}

pub fn list_tasks(conn: &Connection, filter: ListFilter<'_>) -> Result<Vec<TaskListRow>, String> {
    let mut sql = String::from(
        "SELECT t.id, p.name, c.name, t.priority, t.due_date, t.completed_at, t.title \
         FROM tasks t \
         JOIN projects p ON p.id = t.project_id \
         JOIN columns c ON c.id = t.column_id",
    );
    let mut wheres: Vec<&str> = Vec::new();
    let mut binds: Vec<String> = Vec::new();
    if let Some(p) = filter.project {
        wheres.push("p.name = ?");
        binds.push(p.to_string());
    }
    if let Some(s) = filter.status {
        wheres.push("c.name = ?");
        binds.push(s.to_string());
    }
    if !wheres.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&wheres.join(" AND "));
    }
    sql.push_str(" ORDER BY p.name ASC, c.position ASC, t.position ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("SQL準備失敗: {e}"))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(binds.iter()), |r| {
            Ok(TaskListRow {
                id: r.get(0)?,
                project_name: r.get(1)?,
                column_name: r.get(2)?,
                priority: r.get::<_, i64>(3)? as u8,
                due_date: r.get::<_, Option<String>>(4)?,
                completed_at: r.get::<_, Option<String>>(5)?,
                title: r.get(6)?,
            })
        })
        .map_err(|e| format!("list実行失敗: {e}"))?;

    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| format!("行取得失敗: {e}"))?);
    }
    Ok(out)
}

#[derive(Debug, Clone)]
pub struct MoveResult {
    pub id: String,
    pub status: String,
}

pub fn move_task(conn: &Connection, id: &str, status: &str) -> Result<MoveResult, String> {
    let project_id: String = conn
        .query_row(
            "SELECT project_id FROM tasks WHERE id = ?",
            params![id],
            |r| r.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| format!("タスク取得失敗: {e}"))?
        .ok_or_else(|| format!("タスクが見つかりません: {id}"))?;
    let column_id = find_column_id(conn, &project_id, status)?;
    let pos = next_task_position(conn, &column_id)?;
    let ts = now_iso();

    let n = conn
        .execute(
            "UPDATE tasks SET column_id = ?, position = ?, updated_at = ? WHERE id = ?",
            params![column_id, pos, ts, id],
        )
        .map_err(|e| format!("タスク更新失敗: {e}"))?;
    if n == 0 {
        return Err(format!("タスクが見つかりません: {id}"));
    }

    Ok(MoveResult {
        id: id.to_string(),
        status: status.to_string(),
    })
}

/// `done` は `move` の `--status "Done"` 別名 (ユーザー選択により)。
pub fn done_task(conn: &Connection, id: &str) -> Result<MoveResult, String> {
    move_task(conn, id, "Done")
}

// ── project CRUD ──

const DEFAULT_COLUMNS: &[&str] = &["Todo", "In Progress", "Done"];

#[derive(Debug, Clone)]
pub struct ProjectAddResult {
    pub id: String,
    pub name: String,
    pub columns: Vec<String>,
}

pub fn add_project(
    conn: &Connection,
    name: &str,
    columns: Option<&[String]>,
) -> Result<ProjectAddResult, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("プロジェクト名は必須です".into());
    }

    let exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM projects WHERE name = ?",
            params![name],
            |r| r.get(0),
        )
        .map_err(|e| format!("重複チェック失敗: {e}"))?;

    if exists {
        return Err(format!("プロジェクトは既に存在します: {name}"));
    }

    let col_names: Vec<String> = match columns {
        Some(cols) => cols.to_vec(),
        None => DEFAULT_COLUMNS.iter().map(|s| s.to_string()).collect(),
    };

    let id = new_ulid();
    let ts = now_iso();

    conn.execute_batch("BEGIN;")
        .map_err(|e| format!("トランザクション開始失敗: {e}"))?;

    let result = (|| -> Result<(), String> {
        conn.execute(
            "INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            params![id, name, ts, ts],
        )
        .map_err(|e| format!("プロジェクト作成失敗: {e}"))?;

        for (i, col_name) in col_names.iter().enumerate() {
            let col_id = new_ulid();
            conn.execute(
                "INSERT INTO columns (id, project_id, name, position) VALUES (?, ?, ?, ?)",
                params![col_id, id, col_name, i as i64],
            )
            .map_err(|e| format!("列作成失敗: {e}"))?;
        }
        Ok(())
    })();

    match result {
        Ok(()) => {
            conn.execute_batch("COMMIT;")
                .map_err(|e| format!("コミット失敗: {e}"))?;
            Ok(ProjectAddResult {
                id,
                name: name.to_string(),
                columns: col_names,
            })
        }
        Err(e) => {
            let _ = conn.execute_batch("ROLLBACK;");
            Err(e)
        }
    }
}

pub fn list_projects_summary(conn: &Connection) -> Result<Vec<ProjectListRow>, String> {
    let sql = "\
        SELECT p.id, p.name, \
               (SELECT COUNT(*) FROM columns c WHERE c.project_id = p.id) AS col_count, \
               (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count \
        FROM projects p \
        ORDER BY p.name ASC";

    let mut stmt = conn.prepare(sql).map_err(|e| format!("SQL準備失敗: {e}"))?;
    let rows = stmt
        .query_map([], |r| {
            Ok(ProjectListRow {
                id: r.get(0)?,
                name: r.get(1)?,
                column_count: r.get(2)?,
                task_count: r.get(3)?,
            })
        })
        .map_err(|e| format!("list実行失敗: {e}"))?;

    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| format!("行取得失敗: {e}"))?);
    }
    Ok(out)
}

#[derive(Debug, Clone)]
pub struct ProjectRenameResult {
    pub id: String,
    pub old_name: String,
    pub new_name: String,
}

pub fn rename_project(
    conn: &Connection,
    id: &str,
    new_name: &str,
) -> Result<ProjectRenameResult, String> {
    let new_name = new_name.trim();
    if new_name.is_empty() {
        return Err("プロジェクト名は必須です".into());
    }

    let old_name: String = conn
        .query_row(
            "SELECT name FROM projects WHERE id = ?",
            params![id],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| format!("プロジェクト取得失敗: {e}"))?
        .ok_or_else(|| format!("プロジェクトが見つかりません: {id}"))?;

    let ts = now_iso();
    conn.execute(
        "UPDATE projects SET name = ?, updated_at = ? WHERE id = ?",
        params![new_name, ts, id],
    )
    .map_err(|e| format!("プロジェクト更新失敗: {e}"))?;

    Ok(ProjectRenameResult {
        id: id.to_string(),
        old_name,
        new_name: new_name.to_string(),
    })
}

#[derive(Debug, Clone)]
pub struct ProjectDeleteResult {
    pub id: String,
    pub name: String,
}

pub fn delete_project(
    conn: &Connection,
    id: &str,
    force: bool,
) -> Result<ProjectDeleteResult, String> {
    let name: String = conn
        .query_row(
            "SELECT name FROM projects WHERE id = ?",
            params![id],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| format!("プロジェクト取得失敗: {e}"))?
        .ok_or_else(|| format!("プロジェクトが見つかりません: {id}"))?;

    if !force {
        let task_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE project_id = ?",
                params![id],
                |r| r.get(0),
            )
            .map_err(|e| format!("タスク数取得失敗: {e}"))?;

        if task_count > 0 {
            return Err(format!(
                "プロジェクト「{name}」には {task_count} 件のタスクがあります。削除するには --force を指定してください"
            ));
        }
    }

    conn.execute("DELETE FROM projects WHERE id = ?", params![id])
        .map_err(|e| format!("プロジェクト削除失敗: {e}"))?;

    Ok(ProjectDeleteResult {
        id: id.to_string(),
        name,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture() -> Connection {
        let conn = Connection::open_in_memory().expect("open");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        init_schema_for_test(&conn).unwrap();

        let ts = "2026-05-23T00:00:00.000Z";
        conn.execute(
            "INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            params!["proj-1", "Dev", ts, ts],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            params!["proj-2", "Other", ts, ts],
        )
        .unwrap();
        for (cid, pid, name, pos) in [
            ("col-todo", "proj-1", "Todo", 0),
            ("col-doing", "proj-1", "In Progress", 1),
            ("col-done", "proj-1", "Done", 2),
            ("col-other-todo", "proj-2", "Todo", 0),
        ] {
            conn.execute(
                "INSERT INTO columns (id, project_id, name, position) VALUES (?, ?, ?, ?)",
                params![cid, pid, name, pos],
            )
            .unwrap();
        }
        conn
    }

    #[test]
    fn add_task_creates_row_with_next_position() {
        let conn = fixture();
        let r = add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Todo",
                title: "hello",
                memo: Some("m"),
                due: Some("2026-05-30"),
                priority: Some(3),
            },
        )
        .unwrap();
        assert_eq!(r.project_name, "Dev");
        assert_eq!(r.column_name, "Todo");

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM tasks", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);

        let r2 = add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Todo",
                title: "second",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap();
        let pos: i64 = conn
            .query_row("SELECT position FROM tasks WHERE id = ?", params![r2.id], |r| r.get(0))
            .unwrap();
        assert_eq!(pos, 1);
    }

    #[test]
    fn add_task_unknown_project_errors() {
        let conn = fixture();
        let err = add_task(
            &conn,
            AddInput {
                project: "Nope",
                status: "Todo",
                title: "x",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap_err();
        assert!(err.contains("プロジェクト"));
    }

    #[test]
    fn add_task_unknown_status_errors() {
        let conn = fixture();
        let err = add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Backlog",
                title: "x",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap_err();
        assert!(err.contains("列"));
    }

    #[test]
    fn add_task_empty_title_errors() {
        let conn = fixture();
        let err = add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Todo",
                title: "   ",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap_err();
        assert!(err.contains("タイトル"));
    }

    #[test]
    fn list_tasks_empty_returns_empty() {
        let conn = fixture();
        let rows = list_tasks(&conn, ListFilter::default()).unwrap();
        assert!(rows.is_empty());
    }

    #[test]
    fn list_tasks_filters_by_project_and_status() {
        let conn = fixture();
        add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Todo",
                title: "a",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap();
        add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Done",
                title: "b",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap();
        add_task(
            &conn,
            AddInput {
                project: "Other",
                status: "Todo",
                title: "c",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap();

        let all = list_tasks(&conn, ListFilter::default()).unwrap();
        assert_eq!(all.len(), 3);

        let dev = list_tasks(
            &conn,
            ListFilter {
                project: Some("Dev"),
                status: None,
            },
        )
        .unwrap();
        assert_eq!(dev.len(), 2);
        assert!(dev.iter().all(|r| r.project_name == "Dev"));

        let todo_only = list_tasks(
            &conn,
            ListFilter {
                project: None,
                status: Some("Todo"),
            },
        )
        .unwrap();
        assert_eq!(todo_only.len(), 2);
        assert!(todo_only.iter().all(|r| r.column_name == "Todo"));

        let dev_todo = list_tasks(
            &conn,
            ListFilter {
                project: Some("Dev"),
                status: Some("Todo"),
            },
        )
        .unwrap();
        assert_eq!(dev_todo.len(), 1);
        assert_eq!(dev_todo[0].title, "a");
    }

    #[test]
    fn move_task_updates_column_and_position() {
        let conn = fixture();
        let added = add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Todo",
                title: "x",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap();

        let r = move_task(&conn, &added.id, "In Progress").unwrap();
        assert_eq!(r.status, "In Progress");

        let (col, pos): (String, i64) = conn
            .query_row(
                "SELECT column_id, position FROM tasks WHERE id = ?",
                params![added.id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(col, "col-doing");
        assert_eq!(pos, 0);
    }

    #[test]
    fn move_task_unknown_id_errors() {
        let conn = fixture();
        let err = move_task(&conn, "no-such-id", "Done").unwrap_err();
        assert!(err.contains("タスク"));
    }

    #[test]
    fn move_task_unknown_status_errors() {
        let conn = fixture();
        let added = add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Todo",
                title: "x",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap();
        let err = move_task(&conn, &added.id, "Nowhere").unwrap_err();
        assert!(err.contains("列"));
    }

    #[test]
    fn done_task_moves_to_done_column() {
        let conn = fixture();
        let added = add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Todo",
                title: "x",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap();
        let r = done_task(&conn, &added.id).unwrap();
        assert_eq!(r.status, "Done");

        let col: String = conn
            .query_row(
                "SELECT column_id FROM tasks WHERE id = ?",
                params![added.id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(col, "col-done");
    }

    #[test]
    fn done_task_without_done_column_errors() {
        let conn = fixture();
        // 一旦 col-done を削除して Done 列のないプロジェクトに
        conn.execute("DELETE FROM columns WHERE id = ?", params!["col-done"])
            .unwrap();
        let added = add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Todo",
                title: "x",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap();
        let err = done_task(&conn, &added.id).unwrap_err();
        assert!(err.contains("Done") || err.contains("列"));
    }

    // ── project CRUD tests ──

    #[test]
    fn add_project_creates_with_default_columns() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        init_schema_for_test(&conn).unwrap();

        let r = add_project(&conn, "テスト", None).unwrap();
        assert_eq!(r.name, "テスト");
        assert_eq!(r.columns, vec!["Todo", "In Progress", "Done"]);

        let col_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM columns WHERE project_id = ?",
                params![r.id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(col_count, 3);
    }

    #[test]
    fn add_project_with_custom_columns() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        init_schema_for_test(&conn).unwrap();

        let cols = vec!["A".into(), "B".into()];
        let r = add_project(&conn, "カスタム", Some(&cols)).unwrap();
        assert_eq!(r.columns, vec!["A", "B"]);

        let col_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM columns WHERE project_id = ?",
                params![r.id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(col_count, 2);
    }

    #[test]
    fn add_project_duplicate_name_errors() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        init_schema_for_test(&conn).unwrap();

        add_project(&conn, "Dup", None).unwrap();
        let err = add_project(&conn, "Dup", None).unwrap_err();
        assert!(err.contains("既に存在"));
    }

    #[test]
    fn add_project_empty_name_errors() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        init_schema_for_test(&conn).unwrap();

        let err = add_project(&conn, "  ", None).unwrap_err();
        assert!(err.contains("プロジェクト名は必須"));
    }

    #[test]
    fn list_projects_empty() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        init_schema_for_test(&conn).unwrap();

        let rows = list_projects_summary(&conn).unwrap();
        assert!(rows.is_empty());
    }

    #[test]
    fn list_projects_counts_columns_and_tasks() {
        let conn = fixture();
        // fixture: proj-1 "Dev" has 3 columns, proj-2 "Other" has 1 column
        // add tasks to Dev
        add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Todo",
                title: "a",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap();
        add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Done",
                title: "b",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap();

        let rows = list_projects_summary(&conn).unwrap();
        assert_eq!(rows.len(), 2);

        let dev = rows.iter().find(|r| r.name == "Dev").unwrap();
        assert_eq!(dev.column_count, 3);
        assert_eq!(dev.task_count, 2);

        let other = rows.iter().find(|r| r.name == "Other").unwrap();
        assert_eq!(other.column_count, 1);
        assert_eq!(other.task_count, 0);
    }

    #[test]
    fn rename_project_updates_name() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        init_schema_for_test(&conn).unwrap();

        let added = add_project(&conn, "旧名", None).unwrap();
        let r = rename_project(&conn, &added.id, "新名").unwrap();
        assert_eq!(r.old_name, "旧名");
        assert_eq!(r.new_name, "新名");

        let name: String = conn
            .query_row(
                "SELECT name FROM projects WHERE id = ?",
                params![added.id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(name, "新名");
    }

    #[test]
    fn rename_project_unknown_id_errors() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        init_schema_for_test(&conn).unwrap();

        let err = rename_project(&conn, "no-such-id", "X").unwrap_err();
        assert!(err.contains("見つかりません"));
    }

    #[test]
    fn delete_project_without_tasks() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        init_schema_for_test(&conn).unwrap();

        let added = add_project(&conn, "削除対象", None).unwrap();
        let r = delete_project(&conn, &added.id, false).unwrap();
        assert_eq!(r.name, "削除対象");

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM projects WHERE id = ?", params![added.id], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn delete_project_with_tasks_no_force_errors() {
        let conn = fixture();
        add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Todo",
                title: "x",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap();

        let err = delete_project(&conn, "proj-1", false).unwrap_err();
        assert!(err.contains("--force"));
        assert!(err.contains("1 件"));
    }

    #[test]
    fn delete_project_with_tasks_force_succeeds() {
        let conn = fixture();
        add_task(
            &conn,
            AddInput {
                project: "Dev",
                status: "Todo",
                title: "x",
                memo: None,
                due: None,
                priority: None,
            },
        )
        .unwrap();

        let r = delete_project(&conn, "proj-1", true).unwrap();
        assert_eq!(r.name, "Dev");

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM projects WHERE id = ?", params!["proj-1"], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);

        // CASCADE check: tasks and columns should be deleted too
        let task_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM tasks WHERE project_id = ?", params!["proj-1"], |r| r.get(0))
            .unwrap();
        assert_eq!(task_count, 0);
    }

    #[test]
    fn delete_project_unknown_id_errors() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        init_schema_for_test(&conn).unwrap();

        let err = delete_project(&conn, "no-such-id", false).unwrap_err();
        assert!(err.contains("見つかりません"));
    }
}
