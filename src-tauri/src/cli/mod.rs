//! CLI サブシステム (Step 9 / spec §7).
//!
//! - `args`   : argv → コマンド (pure)
//! - `db`     : rusqlite 経由のCRUD
//! - `output` : 標準出力フォーマット (pure)
//!
//! [`try_dispatch`] が `Some(exit_code)` を返したら GUI を起動せず終了する。

pub mod args;
pub mod date_range;
pub mod db;
pub mod output;

/// argvにCLIサブコマンドがあれば実行して終了コードを返す。
/// `None` の場合はGUI起動へ委ねる。
pub fn try_dispatch(argv: &[String]) -> Option<i32> {
    match args::parse_args(argv) {
        args::ParseOutcome::NotCli => None,
        args::ParseOutcome::Help(msg) => {
            println!("{msg}");
            Some(0)
        }
        args::ParseOutcome::Error(msg) => {
            eprintln!("error: {msg}");
            Some(2)
        }
        args::ParseOutcome::Parsed(p) => Some(execute(p)),
    }
}

fn execute(p: args::ParsedCli) -> i32 {
    let path = match p.global.db_path {
        Some(s) => std::path::PathBuf::from(s),
        None => match db::default_db_path() {
            Ok(p) => p,
            Err(e) => {
                eprintln!("error: {e}");
                return 2;
            }
        },
    };
    let conn = match db::open_db(&path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("error: {e}");
            return 2;
        }
    };

    match p.command {
        args::CliCommand::Add(a) => match db::add_task(
            &conn,
            db::AddInput {
                project: &a.project,
                status: &a.status,
                title: &a.title,
                memo: a.memo.as_deref(),
                due: a.due.as_deref(),
                priority: a.priority,
            },
        ) {
            Ok(r) => {
                println!(
                    "{}",
                    output::format_add_success(&r.id, &r.project_name, &r.column_name)
                );
                0
            }
            Err(e) => {
                eprintln!("error: {e}");
                1
            }
        },
        args::CliCommand::List(l) => match db::list_tasks(
            &conn,
            db::ListFilter {
                project: l.project.as_deref(),
                status: l.status.as_deref(),
            },
        ) {
            Ok(rows) => {
                print!("{}", output::format_list(&rows));
                0
            }
            Err(e) => {
                eprintln!("error: {e}");
                1
            }
        },
        args::CliCommand::Move(m) => match db::move_task(&conn, &m.id, &m.status) {
            Ok(r) => {
                println!("{}", output::format_move_success(&r.id, &r.status));
                0
            }
            Err(e) => {
                eprintln!("error: {e}");
                1
            }
        },
        args::CliCommand::Done(d) => match db::done_task(&conn, &d.id) {
            Ok(r) => {
                println!("{}", output::format_done_success(&r.id));
                0
            }
            Err(e) => {
                eprintln!("error: {e}");
                1
            }
        },
        args::CliCommand::ProjectAdd(a) => {
            match db::add_project(&conn, &a.name, a.columns.as_deref()) {
                Ok(r) => {
                    println!(
                        "{}",
                        output::format_project_add_success(&r.id, &r.name, &r.columns)
                    );
                    0
                }
                Err(e) => {
                    eprintln!("error: {e}");
                    1
                }
            }
        }
        args::CliCommand::ProjectList => match db::list_projects_summary(&conn) {
            Ok(rows) => {
                print!("{}", output::format_project_list(&rows));
                0
            }
            Err(e) => {
                eprintln!("error: {e}");
                1
            }
        },
        args::CliCommand::ProjectRename(a) => match db::rename_project(&conn, &a.id, &a.name) {
            Ok(r) => {
                println!(
                    "{}",
                    output::format_project_rename_success(&r.id, &r.old_name, &r.new_name)
                );
                0
            }
            Err(e) => {
                eprintln!("error: {e}");
                1
            }
        },
        args::CliCommand::LogList(l) => {
            let today = date_range::today_local();
            let from = l.from.unwrap_or_else(|| today.clone());
            let to = l.to.unwrap_or(today);
            let (from_utc, to_utc) = match date_range::local_date_range_to_utc(&from, &to) {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("error: {e}");
                    return 2;
                }
            };
            match db::list_work_logs(
                &conn,
                &from_utc,
                &to_utc,
                db::WorkLogListFilter {
                    project: l.project.as_deref(),
                },
            ) {
                Ok(rows) => {
                    let offset = *chrono::Local::now().offset();
                    print!("{}", output::format_log_list(&rows, &from, &to, offset));
                    0
                }
                Err(e) => {
                    eprintln!("error: {e}");
                    1
                }
            }
        }
        args::CliCommand::ProjectDelete(a) => match db::delete_project(&conn, &a.id, a.force) {
            Ok(r) => {
                println!(
                    "{}",
                    output::format_project_delete_success(&r.id, &r.name)
                );
                0
            }
            Err(e) => {
                eprintln!("error: {e}");
                1
            }
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn argv(parts: &[&str]) -> Vec<String> {
        parts.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn no_args_returns_none_for_gui() {
        assert_eq!(try_dispatch(&argv(&["app.exe"])), None);
    }

    #[test]
    fn quick_flag_returns_none_for_gui() {
        assert_eq!(try_dispatch(&argv(&["app.exe", "--quick"])), None);
    }

    #[test]
    fn help_returns_zero() {
        assert_eq!(try_dispatch(&argv(&["app.exe", "task", "--help"])), Some(0));
    }

    #[test]
    fn parse_error_returns_two() {
        assert_eq!(try_dispatch(&argv(&["app.exe", "task", "unknown"])), Some(2));
    }

    #[test]
    fn end_to_end_add_list_move_done() {
        // tempfile を入れずに ulid 名でテンポラリDBパスを作る
        let tmp = std::env::temp_dir().join(format!("memori-cli-{}.sqlite", ulid::Ulid::new()));
        let path_str = tmp.to_string_lossy().to_string();

        // セットアップ: GUIマイグレーション相当をテスト用に流す
        {
            let conn = db::open_db(&tmp).unwrap();
            db::init_schema_for_test(&conn).unwrap();
            use rusqlite::params;
            let ts = "2026-05-23T00:00:00.000Z";
            conn.execute(
                "INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
                params!["pid", "Dev", ts, ts],
            )
            .unwrap();
            for (cid, name, pos) in [("c1", "Todo", 0), ("c2", "Done", 1)] {
                conn.execute(
                    "INSERT INTO columns (id, project_id, name, position) VALUES (?, ?, ?, ?)",
                    params![cid, "pid", name, pos],
                )
                .unwrap();
            }
        }

        // add
        let code = try_dispatch(&argv(&[
            "app.exe",
            "task",
            "add",
            "--db",
            &path_str,
            "--title",
            "hello",
            "--project",
            "Dev",
            "--status",
            "Todo",
        ]))
        .unwrap();
        assert_eq!(code, 0);

        // 作成されたタスクIDを取得
        let id: String = {
            let conn = db::open_db(&tmp).unwrap();
            conn.query_row("SELECT id FROM tasks LIMIT 1", [], |r| r.get(0))
                .unwrap()
        };

        // list
        let code = try_dispatch(&argv(&["app.exe", "task", "list", "--db", &path_str])).unwrap();
        assert_eq!(code, 0);

        // done
        let code = try_dispatch(&argv(&["app.exe", "task", "done", "--db", &path_str, &id])).unwrap();
        assert_eq!(code, 0);

        // 検証: column_id = c2
        {
            use rusqlite::params;
            let conn = db::open_db(&tmp).unwrap();
            let col: String = conn
                .query_row("SELECT column_id FROM tasks WHERE id = ?", params![id], |r| {
                    r.get(0)
                })
                .unwrap();
            assert_eq!(col, "c2");
        }

        let _ = std::fs::remove_file(&tmp);
    }

    // ── project 統合テスト ──

    #[test]
    fn project_help_returns_zero() {
        assert_eq!(
            try_dispatch(&argv(&["app.exe", "project", "--help"])),
            Some(0)
        );
    }

    #[test]
    fn project_unknown_subcommand_returns_two() {
        assert_eq!(
            try_dispatch(&argv(&["app.exe", "project", "unknown"])),
            Some(2)
        );
    }

    // ── log 統合テスト ──

    #[test]
    fn log_help_returns_zero() {
        assert_eq!(try_dispatch(&argv(&["app.exe", "log", "--help"])), Some(0));
    }

    #[test]
    fn log_unknown_subcommand_returns_two() {
        assert_eq!(
            try_dispatch(&argv(&["app.exe", "log", "unknown"])),
            Some(2)
        );
    }

    #[test]
    fn end_to_end_log_list_project_task_and_log() {
        let tmp = std::env::temp_dir().join(format!("memori-cli-log-{}.sqlite", ulid::Ulid::new()));
        let path_str = tmp.to_string_lossy().to_string();

        {
            let conn = db::open_db(&tmp).unwrap();
            db::init_schema_for_test(&conn).unwrap();
        }

        // project add
        let code = try_dispatch(&argv(&[
            "app.exe", "project", "add", "--db", &path_str, "--name", "開発",
        ]))
        .unwrap();
        assert_eq!(code, 0);

        // task add
        let code = try_dispatch(&argv(&[
            "app.exe", "task", "add", "--db", &path_str, "--title", "作業ログ機能を実装",
            "--project", "開発", "--status", "Todo",
        ]))
        .unwrap();
        assert_eq!(code, 0);

        let task_id: String = {
            let conn = db::open_db(&tmp).unwrap();
            conn.query_row("SELECT id FROM tasks LIMIT 1", [], |r| r.get(0))
                .unwrap()
        };

        // 作業ログを直接挿入(CLIには log add が無いため)
        {
            use rusqlite::params;
            let conn = db::open_db(&tmp).unwrap();
            let today = date_range::today_local();
            let ts = format!("{today}T01:00:00.000Z");
            conn.execute(
                "INSERT INTO work_logs (id, task_id, project_id, body, task_title, project_name, created_at, updated_at)\
                 SELECT 'L1', t.id, t.project_id, '実装を進めた', t.title, p.name, ?, ?\
                 FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = ?",
                params![ts, ts, task_id],
            )
            .unwrap();
        }

        // log list (今日, 期間省略) で拾える
        let code = try_dispatch(&argv(&["app.exe", "log", "list", "--db", &path_str])).unwrap();
        assert_eq!(code, 0);

        // 実際の出力内容も検証
        let rows = {
            let conn = db::open_db(&tmp).unwrap();
            let today = date_range::today_local();
            let (from_utc, to_utc) = date_range::local_date_range_to_utc(&today, &today).unwrap();
            db::list_work_logs(&conn, &from_utc, &to_utc, db::WorkLogListFilter::default())
                .unwrap()
        };
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].body, "実装を進めた");
        assert_eq!(rows[0].task_title, "作業ログ機能を実装");
        assert_eq!(rows[0].project_name, "開発");
        assert!(!rows[0].task_deleted);

        let _ = std::fs::remove_file(&tmp);
    }

    #[test]
    fn end_to_end_project_add_list_rename_delete() {
        let tmp = std::env::temp_dir().join(format!("memori-cli-proj-{}.sqlite", ulid::Ulid::new()));
        let path_str = tmp.to_string_lossy().to_string();

        {
            let conn = db::open_db(&tmp).unwrap();
            db::init_schema_for_test(&conn).unwrap();
        }

        // project add
        let code = try_dispatch(&argv(&[
            "app.exe", "project", "add", "--db", &path_str, "--name", "開発",
        ]))
        .unwrap();
        assert_eq!(code, 0);

        // project list
        let code = try_dispatch(&argv(&[
            "app.exe", "project", "list", "--db", &path_str,
        ]))
        .unwrap();
        assert_eq!(code, 0);

        // get id
        let id: String = {
            let conn = db::open_db(&tmp).unwrap();
            conn.query_row("SELECT id FROM projects LIMIT 1", [], |r| r.get(0))
                .unwrap()
        };

        // project rename
        let code = try_dispatch(&argv(&[
            "app.exe", "project", "rename", "--db", &path_str, &id, "--name", "新開発",
        ]))
        .unwrap();
        assert_eq!(code, 0);

        // project delete
        let code = try_dispatch(&argv(&[
            "app.exe", "project", "delete", "--db", &path_str, &id,
        ]))
        .unwrap();
        assert_eq!(code, 0);

        let _ = std::fs::remove_file(&tmp);
    }
}
