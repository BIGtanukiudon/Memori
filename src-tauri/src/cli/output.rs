//! CLI出力フォーマット (Step 9 / spec §7).
//!
//! pure function群。`cargo test` で出力例を固定化する。

use chrono::{DateTime, FixedOffset, TimeZone};

/// `list` で一行に表示するタスク要約。
/// DB層で取得した行に、プロジェクト名・列名を結合した想定。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskListRow {
    pub id: String,
    pub project_name: String,
    pub column_name: String,
    pub priority: u8,
    pub due_date: Option<String>,
    pub completed_at: Option<String>,
    pub title: String,
}

/// 優先度→ラベル（TS側 priorityLabel と揃える）。
pub fn priority_label(p: u8) -> &'static str {
    match p {
        1 => "低",
        2 => "中",
        3 => "高",
        _ => "なし",
    }
}

pub fn format_add_success(id: &str, project: &str, status: &str) -> String {
    format!("created: {id}  [{project} / {status}]")
}

pub fn format_move_success(id: &str, status: &str) -> String {
    format!("moved: {id} → {status}")
}

pub fn format_done_success(id: &str) -> String {
    format!("done: {id}")
}

// ── project 出力 ──

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectListRow {
    pub id: String,
    pub name: String,
    pub column_count: i64,
    pub task_count: i64,
}

pub fn format_project_add_success(id: &str, name: &str, columns: &[String]) -> String {
    let cols = columns.join(", ");
    format!("created: {id}  [{name}]  columns: {cols}")
}

pub fn format_project_list(rows: &[ProjectListRow]) -> String {
    if rows.is_empty() {
        return "(プロジェクトなし)".to_string();
    }

    let mut w_id = "ID".len();
    let mut w_name = "NAME".len();
    let mut w_cols = "COLUMNS".len();
    let mut w_tasks = "TASKS".len();
    for r in rows {
        w_id = w_id.max(display_width(&r.id));
        w_name = w_name.max(display_width(&r.name));
        w_cols = w_cols.max(display_width(&r.column_count.to_string()));
        w_tasks = w_tasks.max(display_width(&r.task_count.to_string()));
    }

    let mut out = String::new();
    out.push_str(&format!(
        "{id}{p1}  {name}{p2}  {cols}{p3}  {tasks}\n",
        id = "ID",
        p1 = pad("ID", w_id),
        name = "NAME",
        p2 = pad("NAME", w_name),
        cols = "COLUMNS",
        p3 = pad("COLUMNS", w_cols),
        tasks = "TASKS",
    ));
    for r in rows {
        let cols = r.column_count.to_string();
        let tasks = r.task_count.to_string();
        out.push_str(&format!(
            "{id}{p1}  {name}{p2}  {cols}{p3}  {tasks}\n",
            id = r.id,
            p1 = pad(&r.id, w_id),
            name = r.name,
            p2 = pad(&r.name, w_name),
            cols = cols,
            p3 = pad(&cols, w_cols),
            tasks = tasks,
        ));
    }
    out
}

pub fn format_project_rename_success(id: &str, old_name: &str, new_name: &str) -> String {
    format!("renamed: {id}  {old_name} → {new_name}")
}

pub fn format_project_delete_success(id: &str, name: &str) -> String {
    format!("deleted: {id}  [{name}]")
}

// ── task 出力 ──

/// listを固定幅で整形。0件時は専用メッセージ。
pub fn format_list(rows: &[TaskListRow]) -> String {
    if rows.is_empty() {
        return "(該当タスクなし)".to_string();
    }

    // ヘッダ
    let header = TaskListRow {
        id: "ID".into(),
        project_name: "PROJECT".into(),
        column_name: "STATUS".into(),
        priority: u8::MAX,
        due_date: Some("DUE".into()),
        completed_at: Some("DONE".into()),
        title: "TITLE".into(),
    };

    // 列幅をrows+headerから算出
    let mut w_id = "ID".len();
    let mut w_prj = "PROJECT".len();
    let mut w_col = "STATUS".len();
    let mut w_prio = "PRIO".len();
    let mut w_due = "DUE".len();
    let mut w_done = "DONE".len();
    for r in rows {
        w_id = w_id.max(display_width(&r.id));
        w_prj = w_prj.max(display_width(&r.project_name));
        w_col = w_col.max(display_width(&r.column_name));
        w_prio = w_prio.max(display_width(priority_label(r.priority)));
        let d = r.due_date.as_deref().unwrap_or("-");
        w_due = w_due.max(display_width(d));
        let done = r.completed_at.as_deref().unwrap_or("-");
        w_done = w_done.max(display_width(done));
    }

    let mut out = String::new();
    out.push_str(&format_row(
        &header.id,
        &header.project_name,
        &header.column_name,
        "PRIO",
        header.due_date.as_deref().unwrap_or("-"),
        header.completed_at.as_deref().unwrap_or("-"),
        &header.title,
        w_id,
        w_prj,
        w_col,
        w_prio,
        w_due,
        w_done,
    ));
    out.push('\n');
    for r in rows {
        let d = r.due_date.as_deref().unwrap_or("-");
        let done = r.completed_at.as_deref().unwrap_or("-");
        out.push_str(&format_row(
            &r.id,
            &r.project_name,
            &r.column_name,
            priority_label(r.priority),
            d,
            done,
            &r.title,
            w_id,
            w_prj,
            w_col,
            w_prio,
            w_due,
            w_done,
        ));
        out.push('\n');
    }
    // 末尾改行は呼び出し側で扱う(printlnで再付与しない)よう、最後の \n を残す。
    out
}

#[allow(clippy::too_many_arguments)]
fn format_row(
    id: &str,
    prj: &str,
    col: &str,
    prio: &str,
    due: &str,
    done: &str,
    title: &str,
    w_id: usize,
    w_prj: usize,
    w_col: usize,
    w_prio: usize,
    w_due: usize,
    w_done: usize,
) -> String {
    format!(
        "{id}{p1}  {prj}{p2}  {col}{p3}  {prio}{p4}  {due}{p5}  {done}{p6}  {title}",
        p1 = pad(id, w_id),
        p2 = pad(prj, w_prj),
        p3 = pad(col, w_col),
        p4 = pad(prio, w_prio),
        p5 = pad(due, w_due),
        p6 = pad(done, w_done),
    )
}

/// 表示幅 (ざっくり: ASCIIは1, それ以外2)。日本語列名のためのナイーブ実装。
fn display_width(s: &str) -> usize {
    s.chars().map(|c| if c.is_ascii() { 1 } else { 2 }).sum()
}

fn pad(s: &str, width: usize) -> String {
    let w = display_width(s);
    if w >= width {
        String::new()
    } else {
        " ".repeat(width - w)
    }
}

// ── work_logs (log list) 出力 ──

/// `log list` で一行に表示する作業ログ。
/// DB層で `tasks`/`projects` をLEFT JOINして解決済みの想定。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkLogListRow {
    pub project_name: String,
    pub task_id: String,
    pub task_title: String,
    pub task_deleted: bool,
    /// UTC RFC3339 (`created_at`)。表示直前に `offset` でローカル時刻へ変換する。
    pub created_at: String,
    pub body: String,
}

/// `log list` の出力(Markdown)を整形する。
/// `from == to` なら単日見出し・`HH:mm`、それ以外は複数日見出し・`MM/DD HH:mm`。
/// `offset` は表示用ローカル時刻への変換に使う(実行環境のTZに依存させないため注入式)。
pub fn format_log_list(
    rows: &[WorkLogListRow],
    from: &str,
    to: &str,
    offset: FixedOffset,
) -> String {
    if rows.is_empty() {
        return "(該当する作業ログなし)".to_string();
    }

    let multi_day = from != to;
    let date_heading = if multi_day {
        format!("{from} 〜 {to}")
    } else {
        from.to_string()
    };

    let mut out = format!("# 作業ログ {date_heading}\n");
    let mut current_project: Option<&str> = None;
    let mut current_task: Option<&str> = None;

    for r in rows {
        if current_project != Some(r.project_name.as_str()) {
            out.push('\n');
            out.push_str(&format!("## {}\n", r.project_name));
            current_project = Some(&r.project_name);
            current_task = None;
        }
        if current_task != Some(r.task_id.as_str()) {
            out.push('\n');
            let suffix = if r.task_deleted { " (削除済み)" } else { "" };
            out.push_str(&format!("### {}{}\n", r.task_title, suffix));
            current_task = Some(&r.task_id);
        }

        let local = DateTime::parse_from_rfc3339(&r.created_at)
            .map(|dt| dt.with_timezone(&offset))
            .unwrap_or_else(|_| offset.with_ymd_and_hms(1970, 1, 1, 0, 0, 0).unwrap());
        let time_label = if multi_day {
            local.format("%m/%d %H:%M").to_string()
        } else {
            local.format("%H:%M").to_string()
        };

        let mut lines = r.body.lines();
        let first = lines.next().unwrap_or("");
        out.push_str(&format!("- {time_label} {first}\n"));
        for cont in lines {
            out.push_str(&format!("  {cont}\n"));
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn priority_label_covers_all_values() {
        assert_eq!(priority_label(0), "なし");
        assert_eq!(priority_label(1), "低");
        assert_eq!(priority_label(2), "中");
        assert_eq!(priority_label(3), "高");
        assert_eq!(priority_label(99), "なし"); // fallback
    }

    #[test]
    fn add_success_message() {
        assert_eq!(
            format_add_success("01HX", "開発", "Todo"),
            "created: 01HX  [開発 / Todo]"
        );
    }

    #[test]
    fn move_success_message() {
        assert_eq!(format_move_success("01HX", "Done"), "moved: 01HX → Done");
    }

    #[test]
    fn done_success_message() {
        assert_eq!(format_done_success("01HX"), "done: 01HX");
    }

    #[test]
    fn list_empty_returns_placeholder() {
        assert_eq!(format_list(&[]), "(該当タスクなし)");
    }

    // ── project output tests ──

    #[test]
    fn project_add_success_message() {
        let cols = vec!["Todo".into(), "In Progress".into(), "Done".into()];
        assert_eq!(
            format_project_add_success("01HX", "開発", &cols),
            "created: 01HX  [開発]  columns: Todo, In Progress, Done"
        );
    }

    #[test]
    fn project_list_empty_returns_placeholder() {
        assert_eq!(format_project_list(&[]), "(プロジェクトなし)");
    }

    #[test]
    fn project_list_includes_header_and_rows() {
        let rows = vec![
            ProjectListRow {
                id: "01HX".into(),
                name: "開発".into(),
                column_count: 3,
                task_count: 12,
            },
            ProjectListRow {
                id: "01HY".into(),
                name: "個人".into(),
                column_count: 2,
                task_count: 5,
            },
        ];
        let out = format_project_list(&rows);
        assert!(out.contains("ID"));
        assert!(out.contains("NAME"));
        assert!(out.contains("COLUMNS"));
        assert!(out.contains("TASKS"));
        assert!(out.contains("01HX"));
        assert!(out.contains("開発"));
        assert!(out.contains("12"));
        assert!(out.contains("01HY"));
        assert!(out.contains("個人"));
    }

    #[test]
    fn project_rename_success_message() {
        assert_eq!(
            format_project_rename_success("01HX", "旧", "新"),
            "renamed: 01HX  旧 → 新"
        );
    }

    #[test]
    fn project_delete_success_message() {
        assert_eq!(
            format_project_delete_success("01HX", "開発"),
            "deleted: 01HX  [開発]"
        );
    }

    // ── task output tests ──

    #[test]
    fn list_includes_header_and_rows() {
        let rows = vec![
            TaskListRow {
                id: "01HX".into(),
                project_name: "Dev".into(),
                column_name: "Todo".into(),
                priority: 2,
                due_date: Some("2026-05-30".into()),
                completed_at: None,
                title: "first".into(),
            },
            TaskListRow {
                id: "01HY".into(),
                project_name: "Dev".into(),
                column_name: "Done".into(),
                priority: 0,
                due_date: None,
                completed_at: Some("2026-05-28T12:00:00.000Z".into()),
                title: "second".into(),
            },
        ];
        let out = format_list(&rows);
        assert!(out.contains("ID"));
        assert!(out.contains("PROJECT"));
        assert!(out.contains("STATUS"));
        assert!(out.contains("PRIO"));
        assert!(out.contains("DUE"));
        assert!(out.contains("DONE"));
        assert!(out.contains("TITLE"));
        assert!(out.contains("01HX"));
        assert!(out.contains("01HY"));
        assert!(out.contains("first"));
        assert!(out.contains("second"));
        assert!(out.contains("2026-05-28T12:00:00.000Z"));
        assert!(out.contains("中"));
        assert!(out.contains("なし"));
    }

    // ── log list 出力 ──

    fn jst() -> FixedOffset {
        FixedOffset::east_opt(9 * 3600).unwrap()
    }

    fn log_row(over: impl FnOnce(WorkLogListRow) -> WorkLogListRow) -> WorkLogListRow {
        over(WorkLogListRow {
            project_name: "開発".into(),
            task_id: "T1".into(),
            task_title: "APIのリトライ処理を実装".into(),
            task_deleted: false,
            created_at: "2026-08-30T00:15:00.000Z".into(),
            body: "仕様を確認した".into(),
        })
    }

    #[test]
    fn log_list_empty_returns_placeholder() {
        assert_eq!(
            format_log_list(&[], "2026-08-30", "2026-08-30", jst()),
            "(該当する作業ログなし)"
        );
    }

    #[test]
    fn log_list_single_day_uses_hm_time_and_single_date_heading() {
        let rows = vec![log_row(|r| r)];
        let out = format_log_list(&rows, "2026-08-30", "2026-08-30", jst());
        assert!(out.starts_with("# 作業ログ 2026-08-30\n"));
        assert!(out.contains("## 開発\n"));
        assert!(out.contains("### APIのリトライ処理を実装\n"));
        // UTC 00:15 → JST 09:15
        assert!(out.contains("- 09:15 仕様を確認した\n"));
    }

    #[test]
    fn log_list_multi_day_uses_md_hm_time_and_range_heading() {
        let rows = vec![log_row(|mut r| {
            r.created_at = "2026-08-25T00:15:00.000Z".into();
            r
        })];
        let out = format_log_list(&rows, "2026-08-25", "2026-08-30", jst());
        assert!(out.starts_with("# 作業ログ 2026-08-25 〜 2026-08-30\n"));
        assert!(out.contains("- 08/25 09:15 仕様を確認した\n"));
    }

    #[test]
    fn log_list_groups_same_task_and_marks_deleted_task() {
        let rows = vec![
            log_row(|mut r| {
                r.body = "仕様を確認".into();
                r.created_at = "2026-08-30T00:15:00.000Z".into();
                r
            }),
            log_row(|mut r| {
                r.body = "実装完了".into();
                r.created_at = "2026-08-30T02:40:00.000Z".into();
                r
            }),
            WorkLogListRow {
                project_name: "開発".into(),
                task_id: "T2".into(),
                task_title: "DBマイグレーション整理".into(),
                task_deleted: true,
                created_at: "2026-08-30T05:02:00.000Z".into(),
                body: "004に統合して不要になったので削除".into(),
            },
        ];
        let out = format_log_list(&rows, "2026-08-30", "2026-08-30", jst());
        // 同一タスクの見出しは1回だけ
        assert_eq!(out.matches("### APIのリトライ処理を実装").count(), 1);
        assert!(out.contains("- 09:15 仕様を確認\n"));
        assert!(out.contains("- 11:40 実装完了\n"));
        assert!(out.contains("### DBマイグレーション整理 (削除済み)\n"));
        assert!(out.contains("- 14:02 004に統合して不要になったので削除\n"));
    }

    #[test]
    fn log_list_groups_by_project_then_task() {
        let rows = vec![
            log_row(|r| r),
            WorkLogListRow {
                project_name: "個人".into(),
                task_id: "T9".into(),
                task_title: "買い物".into(),
                task_deleted: false,
                created_at: "2026-08-30T03:00:00.000Z".into(),
                body: "牛乳を買った".into(),
            },
        ];
        let out = format_log_list(&rows, "2026-08-30", "2026-08-30", jst());
        let dev_pos = out.find("## 開発").unwrap();
        let personal_pos = out.find("## 個人").unwrap();
        assert!(dev_pos < personal_pos);
    }

    #[test]
    fn log_list_indents_continuation_lines_of_multiline_body() {
        let rows = vec![log_row(|mut r| {
            r.body = "1行目\n2行目\n3行目".into();
            r
        })];
        let out = format_log_list(&rows, "2026-08-30", "2026-08-30", jst());
        assert!(out.contains("- 09:15 1行目\n"));
        assert!(out.contains("  2行目\n"));
        assert!(out.contains("  3行目\n"));
    }
}
