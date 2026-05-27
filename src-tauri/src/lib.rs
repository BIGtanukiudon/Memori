use tauri::{AppHandle, Manager, WindowEvent};
use tauri_plugin_sql::{Migration, MigrationKind};

pub mod cli;

const QUICK_FLAG: &str = "--quick";
const MAIN_LABEL: &str = "main";
const QUICK_LABEL: &str = "quick";

/// argv に `--quick` が含まれるか判定する。
/// 仕様§3.2 のシングルインスタンス制御で使用。
pub fn is_quick_invocation<S: AsRef<str>>(argv: &[S]) -> bool {
    argv.iter().any(|a| a.as_ref() == QUICK_FLAG)
}

/// argv に応じてウィンドウを show/focus する。
/// --quick: クイック入力ウィンドウ
/// その他: メインウィンドウ
fn show_window_for_args(app: &AppHandle, argv: &[String]) {
    if is_quick_invocation(argv) {
        if let Some(w) = app.get_webview_window(QUICK_LABEL) {
            let _ = w.show();
            let _ = w.set_focus();
        }
    } else if let Some(w) = app.get_webview_window(MAIN_LABEL) {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial schema",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add position column to projects",
            sql: include_str!("../migrations/002_project_position.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add done_column_id to projects and completed_at to tasks",
            sql: include_str!("../migrations/003_done_column.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // §3.2 二次プロセスからargvを受け渡されたら、対応するウィンドウを前面化
            show_window_for_args(app, &argv);
        }))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:kanban.db", migrations)
                .build(),
        )
        .setup(|app| {
            // §3.2 main ウィンドウは × でアプリ全体を終了。
            // quick ウィンドウは hide/show で使い回すため × を抑止して hide する。
            if let Some(main) = app.get_webview_window(MAIN_LABEL) {
                let handle = app.handle().clone();
                main.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { .. } = event {
                        handle.exit(0);
                    }
                });
            }
            if let Some(quick) = app.get_webview_window(QUICK_LABEL) {
                let quick_clone = quick.clone();
                quick.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = quick_clone.hide();
                    }
                });
            }

            // 初回起動時のargv解釈
            let argv: Vec<String> = std::env::args().collect();
            show_window_for_args(&app.handle(), &argv);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_quick_invocation_detects_flag() {
        let argv = vec!["app.exe".to_string(), "--quick".to_string()];
        assert!(is_quick_invocation(&argv));
    }

    #[test]
    fn is_quick_invocation_false_without_flag() {
        let argv = vec!["app.exe".to_string()];
        assert!(!is_quick_invocation(&argv));
    }

    #[test]
    fn is_quick_invocation_false_for_other_flags() {
        let argv = vec!["app.exe".to_string(), "--other".to_string()];
        assert!(!is_quick_invocation(&argv));
    }

    #[test]
    fn is_quick_invocation_works_with_str_slices() {
        let argv = ["app", "--quick"];
        assert!(is_quick_invocation(&argv));
    }

    #[test]
    fn is_quick_invocation_finds_flag_among_others() {
        let argv = vec![
            "app.exe".to_string(),
            "--debug".to_string(),
            "--quick".to_string(),
        ];
        assert!(is_quick_invocation(&argv));
    }
}
