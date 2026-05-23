//! CLI出力フォーマット (Step 9 / spec §7).
//!
//! pure function群。`cargo test` で出力例を固定化する。

/// `list` で一行に表示するタスク要約。
/// DB層で取得した行に、プロジェクト名・列名を結合した想定。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskListRow {
    pub id: String,
    pub project_name: String,
    pub column_name: String,
    pub priority: u8,
    pub due_date: Option<String>,
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
        priority: u8::MAX, // sentinel - 表示時は "PRIO"
        due_date: Some("DUE".into()),
        title: "TITLE".into(),
    };

    // 列幅をrows+headerから算出
    let mut w_id = "ID".len();
    let mut w_prj = "PROJECT".len();
    let mut w_col = "STATUS".len();
    let mut w_prio = "PRIO".len();
    let mut w_due = "DUE".len();
    for r in rows {
        w_id = w_id.max(display_width(&r.id));
        w_prj = w_prj.max(display_width(&r.project_name));
        w_col = w_col.max(display_width(&r.column_name));
        w_prio = w_prio.max(display_width(priority_label(r.priority)));
        let d = r.due_date.as_deref().unwrap_or("-");
        w_due = w_due.max(display_width(d));
    }

    let mut out = String::new();
    out.push_str(&format_row(
        &header.id,
        &header.project_name,
        &header.column_name,
        "PRIO",
        header.due_date.as_deref().unwrap_or("-"),
        &header.title,
        w_id,
        w_prj,
        w_col,
        w_prio,
        w_due,
    ));
    out.push('\n');
    for r in rows {
        let d = r.due_date.as_deref().unwrap_or("-");
        out.push_str(&format_row(
            &r.id,
            &r.project_name,
            &r.column_name,
            priority_label(r.priority),
            d,
            &r.title,
            w_id,
            w_prj,
            w_col,
            w_prio,
            w_due,
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
    title: &str,
    w_id: usize,
    w_prj: usize,
    w_col: usize,
    w_prio: usize,
    w_due: usize,
) -> String {
    format!(
        "{id}{p1}  {prj}{p2}  {col}{p3}  {prio}{p4}  {due}{p5}  {title}",
        p1 = pad(id, w_id),
        p2 = pad(prj, w_prj),
        p3 = pad(col, w_col),
        p4 = pad(prio, w_prio),
        p5 = pad(due, w_due),
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

    #[test]
    fn list_includes_header_and_rows() {
        let rows = vec![
            TaskListRow {
                id: "01HX".into(),
                project_name: "Dev".into(),
                column_name: "Todo".into(),
                priority: 2,
                due_date: Some("2026-05-30".into()),
                title: "first".into(),
            },
            TaskListRow {
                id: "01HY".into(),
                project_name: "Dev".into(),
                column_name: "Done".into(),
                priority: 0,
                due_date: None,
                title: "second".into(),
            },
        ];
        let out = format_list(&rows);
        assert!(out.contains("ID"));
        assert!(out.contains("PROJECT"));
        assert!(out.contains("STATUS"));
        assert!(out.contains("PRIO"));
        assert!(out.contains("DUE"));
        assert!(out.contains("TITLE"));
        assert!(out.contains("01HX"));
        assert!(out.contains("01HY"));
        assert!(out.contains("first"));
        assert!(out.contains("second"));
        assert!(out.contains("-")); // due_date None
        assert!(out.contains("中"));
        assert!(out.contains("なし"));
    }
}
