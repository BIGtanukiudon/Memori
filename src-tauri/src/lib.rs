use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use tauri_plugin_sql::{Migration, MigrationKind};

pub mod cli;

const QUICK_FLAG: &str = "--quick";
const QUICK_LOG_FLAG: &str = "--quick-log";
const MAIN_LABEL: &str = "main";
const QUICK_LABEL: &str = "quick";

/// quick ウィンドウの現在の表示モード。JS側へ渡す際は文字列に変換する。
const QUICK_MODE_TASK: &str = "task";
const QUICK_MODE_LOG: &str = "log";

/// quick ウィンドウがどちらのモード（タスク追加/ログ追加）で開かれたかを
/// 保持する。ウィンドウは hide/show で使い回されるため、起動のたびに更新する。
struct QuickModeState(Mutex<&'static str>);

const QUICK_MODE_EVENT: &str = "quick:mode";

#[derive(Clone, serde::Serialize)]
struct QuickModePayload {
    mode: &'static str,
}

/// argv に `--quick` が含まれるか判定する（`--quick-log` とは完全一致比較のため干渉しない）。
/// 仕様§3.2 のシングルインスタンス制御で使用。
pub fn is_quick_invocation<S: AsRef<str>>(argv: &[S]) -> bool {
    argv.iter().any(|a| a.as_ref() == QUICK_FLAG)
}

/// argv に `--quick-log` が含まれるか判定する（`--quick` とは完全一致比較のため干渉しない）。
pub fn is_quick_log_invocation<S: AsRef<str>>(argv: &[S]) -> bool {
    argv.iter().any(|a| a.as_ref() == QUICK_LOG_FLAG)
}

/// quick ウィンドウの現在のモードをJSから取得するためのコマンド。
/// アプリ起動直後などイベントのlisten登録が間に合わないタイミングでも、
/// マウント時にこのコマンドを呼べば確実に現在のモードを取得できる。
#[tauri::command]
fn get_quick_mode(state: tauri::State<QuickModeState>) -> String {
    (*state.0.lock().unwrap()).to_string()
}

/// argv に応じてウィンドウを show/focus する。
/// --quick: クイック入力ウィンドウ（タスク追加モード）
/// --quick-log: クイック入力ウィンドウ（ログ追加モード）
/// その他: メインウィンドウ
fn show_window_for_args(app: &AppHandle, argv: &[String]) {
    let quick_mode = if is_quick_log_invocation(argv) {
        Some(QUICK_MODE_LOG)
    } else if is_quick_invocation(argv) {
        Some(QUICK_MODE_TASK)
    } else {
        None
    };

    if let Some(mode) = quick_mode {
        if let Some(state) = app.try_state::<QuickModeState>() {
            *state.0.lock().unwrap() = mode;
        }
        let _ = app.emit(QUICK_MODE_EVENT, QuickModePayload { mode });
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
        Migration {
            version: 4,
            description: "create work_logs table",
            sql: include_str!("../migrations/004_work_logs.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .manage(QuickModeState(Mutex::new(QUICK_MODE_TASK)))
        .invoke_handler(tauri::generate_handler![get_quick_mode])
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

    #[test]
    fn is_quick_log_invocation_detects_flag() {
        let argv = vec!["app.exe".to_string(), "--quick-log".to_string()];
        assert!(is_quick_log_invocation(&argv));
    }

    #[test]
    fn is_quick_log_invocation_false_without_flag() {
        let argv = vec!["app.exe".to_string()];
        assert!(!is_quick_log_invocation(&argv));
    }

    #[test]
    fn is_quick_log_invocation_false_for_other_flags() {
        let argv = vec!["app.exe".to_string(), "--other".to_string()];
        assert!(!is_quick_log_invocation(&argv));
    }

    #[test]
    fn is_quick_log_invocation_works_with_str_slices() {
        let argv = ["app", "--quick-log"];
        assert!(is_quick_log_invocation(&argv));
    }

    #[test]
    fn is_quick_log_invocation_finds_flag_among_others() {
        let argv = vec![
            "app.exe".to_string(),
            "--debug".to_string(),
            "--quick-log".to_string(),
        ];
        assert!(is_quick_log_invocation(&argv));
    }

    // --quick-log の追加により --quick の前方一致事故が起きないことを保証する。
    #[test]
    fn is_quick_invocation_false_for_quick_log_flag() {
        let argv = vec!["app.exe".to_string(), "--quick-log".to_string()];
        assert!(!is_quick_invocation(&argv));
    }

    // 逆方向: --quick が --quick-log 判定に誤ってマッチしないことを保証する。
    #[test]
    fn is_quick_log_invocation_false_for_quick_flag() {
        let argv = vec!["app.exe".to_string(), "--quick".to_string()];
        assert!(!is_quick_log_invocation(&argv));
    }

    #[test]
    fn both_flags_are_mutually_exclusive_in_detection() {
        let quick_argv = vec!["app.exe".to_string(), "--quick".to_string()];
        assert!(is_quick_invocation(&quick_argv) && !is_quick_log_invocation(&quick_argv));

        let quick_log_argv = vec!["app.exe".to_string(), "--quick-log".to_string()];
        assert!(is_quick_log_invocation(&quick_log_argv) && !is_quick_invocation(&quick_log_argv));
    }
}
