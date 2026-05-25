//! CLI argument parsing (Step 9 / spec §7).
//!
//! Pure functions: argv → `ParseOutcome`. Tested via `cargo test`.

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GlobalOpts {
    /// `--db <path>` でテスト・運用時にDBパスを上書き。
    pub db_path: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AddArgs {
    pub title: String,
    pub project: String,
    pub status: String,
    pub memo: Option<String>,
    pub due: Option<String>,
    pub priority: Option<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListArgs {
    pub project: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MoveArgs {
    pub id: String,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DoneArgs {
    pub id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectAddArgs {
    pub name: String,
    pub columns: Option<Vec<String>>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectRenameArgs {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectDeleteArgs {
    pub id: String,
    pub force: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CliCommand {
    Add(AddArgs),
    List(ListArgs),
    Move(MoveArgs),
    Done(DoneArgs),
    ProjectAdd(ProjectAddArgs),
    ProjectList,
    ProjectRename(ProjectRenameArgs),
    ProjectDelete(ProjectDeleteArgs),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedCli {
    pub global: GlobalOpts,
    pub command: CliCommand,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ParseOutcome {
    /// `task` サブコマンドが無いのでGUI起動へ。
    NotCli,
    /// `--help` 等。stdoutにメッセージを出して正常終了する。
    Help(String),
    Parsed(ParsedCli),
    Error(String),
}

const TASK_SUBCOMMAND: &str = "task";
const PROJECT_SUBCOMMAND: &str = "project";

const TASK_HELP_TEXT: &str = "\
Memori CLI — task

USAGE:
  app.exe task <SUBCOMMAND> [OPTIONS]
  app.exe task --help

SUBCOMMANDS:
  add    タスクを追加
  list   タスク一覧を表示
  move   タスクのステータス（列）を変更
  done   タスクを Done 列に移動 (= move --status Done)

GLOBAL OPTIONS:
  --db <path>            SQLite DBパスを上書き

ADD:
  app.exe task add --title <T> --project <P> --status <S> \\
                   [--memo <M>] [--due <YYYY-MM-DD>] [--priority <0-3|none|low|med|high>]

LIST:
  app.exe task list [--project <P>] [--status <S>]

MOVE:
  app.exe task move <id> --status <S>

DONE:
  app.exe task done <id>
";

const PROJECT_HELP_TEXT: &str = "\
Memori CLI — project

USAGE:
  app.exe project <SUBCOMMAND> [OPTIONS]
  app.exe project --help

SUBCOMMANDS:
  add      プロジェクトを新規作成
  list     プロジェクト一覧を表示
  rename   プロジェクト名を変更
  delete   プロジェクトを削除

GLOBAL OPTIONS:
  --db <path>            SQLite DBパスを上書き

ADD:
  app.exe project add --name <N> [--columns <C1,C2,...>]
  (--columns 省略時は Todo,In Progress,Done をデフォルト作成)

LIST:
  app.exe project list

RENAME:
  app.exe project rename <id> --name <N>

DELETE:
  app.exe project delete <id> [--force]
";

pub fn is_cli_argv(argv: &[String]) -> bool {
    matches!(
        argv.get(1).map(|s| s.as_str()),
        Some(TASK_SUBCOMMAND) | Some(PROJECT_SUBCOMMAND)
    )
}

pub fn parse_args(argv: &[String]) -> ParseOutcome {
    let mut iter = argv.iter().skip(1);
    let Some(first) = iter.next() else {
        return ParseOutcome::NotCli;
    };
    let rest: Vec<String> = iter.cloned().collect();

    match first.as_str() {
        TASK_SUBCOMMAND => parse_task_command(&rest),
        PROJECT_SUBCOMMAND => parse_project_command(&rest),
        _ => ParseOutcome::NotCli,
    }
}

fn parse_task_command(rest: &[String]) -> ParseOutcome {
    if rest.iter().any(|a| a == "--help" || a == "-h") {
        return ParseOutcome::Help(TASK_HELP_TEXT.to_string());
    }

    let Some(sub) = rest.first() else {
        return ParseOutcome::Help(TASK_HELP_TEXT.to_string());
    };
    let sub_args = &rest[1..];

    match sub.as_str() {
        "add" => parse_add(sub_args),
        "list" => parse_list(sub_args),
        "move" => parse_move(sub_args),
        "done" => parse_done(sub_args),
        other => ParseOutcome::Error(format!("未知のサブコマンド: {other}")),
    }
}

fn parse_project_command(rest: &[String]) -> ParseOutcome {
    if rest.iter().any(|a| a == "--help" || a == "-h") {
        return ParseOutcome::Help(PROJECT_HELP_TEXT.to_string());
    }

    let Some(sub) = rest.first() else {
        return ParseOutcome::Help(PROJECT_HELP_TEXT.to_string());
    };
    let sub_args = &rest[1..];

    match sub.as_str() {
        "add" => parse_project_add(sub_args),
        "list" => parse_project_list(sub_args),
        "rename" => parse_project_rename(sub_args),
        "delete" => parse_project_delete(sub_args),
        other => ParseOutcome::Error(format!("未知のサブコマンド: {other}")),
    }
}

/// 共通: `--flag value` ペアと positional をフラットに分離。
struct Tokens {
    flags: Vec<(String, String)>,
    positionals: Vec<String>,
}

fn tokenize(args: &[String]) -> Result<Tokens, String> {
    let mut flags: Vec<(String, String)> = Vec::new();
    let mut positionals: Vec<String> = Vec::new();
    let mut i = 0;
    while i < args.len() {
        let a = &args[i];
        if let Some(name) = a.strip_prefix("--") {
            let Some(val) = args.get(i + 1) else {
                return Err(format!("--{name} に値が指定されていません"));
            };
            if val.starts_with("--") {
                return Err(format!("--{name} に値が指定されていません"));
            }
            flags.push((name.to_string(), val.clone()));
            i += 2;
        } else {
            positionals.push(a.clone());
            i += 1;
        }
    }
    Ok(Tokens { flags, positionals })
}

fn extract_global(flags: &mut Vec<(String, String)>) -> GlobalOpts {
    let mut db_path: Option<String> = None;
    flags.retain(|(k, v)| {
        if k == "db" {
            db_path = Some(v.clone());
            false
        } else {
            true
        }
    });
    GlobalOpts { db_path }
}

fn take_flag(flags: &mut Vec<(String, String)>, name: &str) -> Option<String> {
    let pos = flags.iter().position(|(k, _)| k == name)?;
    Some(flags.remove(pos).1)
}

fn parse_priority(s: &str) -> Result<u8, String> {
    match s.to_ascii_lowercase().as_str() {
        "0" | "none" | "なし" => Ok(0),
        "1" | "low" | "低" => Ok(1),
        "2" | "med" | "medium" | "中" => Ok(2),
        "3" | "high" | "高" => Ok(3),
        other => Err(format!("優先度の値が不正です: {other}")),
    }
}

fn parse_add(args: &[String]) -> ParseOutcome {
    let mut tokens = match tokenize(args) {
        Ok(t) => t,
        Err(e) => return ParseOutcome::Error(e),
    };
    let global = extract_global(&mut tokens.flags);

    if !tokens.positionals.is_empty() {
        return ParseOutcome::Error(format!(
            "add は位置引数を取りません: {:?}",
            tokens.positionals
        ));
    }

    let title = match take_flag(&mut tokens.flags, "title") {
        Some(v) => v,
        None => return ParseOutcome::Error("add: --title は必須です".into()),
    };
    let project = match take_flag(&mut tokens.flags, "project") {
        Some(v) => v,
        None => return ParseOutcome::Error("add: --project は必須です".into()),
    };
    let status = match take_flag(&mut tokens.flags, "status") {
        Some(v) => v,
        None => return ParseOutcome::Error("add: --status は必須です".into()),
    };
    let memo = take_flag(&mut tokens.flags, "memo");
    let due = take_flag(&mut tokens.flags, "due");
    let priority = match take_flag(&mut tokens.flags, "priority") {
        Some(v) => match parse_priority(&v) {
            Ok(p) => Some(p),
            Err(e) => return ParseOutcome::Error(e),
        },
        None => None,
    };

    if let Some((k, _)) = tokens.flags.first() {
        return ParseOutcome::Error(format!("add: 未知のフラグ --{k}"));
    }

    ParseOutcome::Parsed(ParsedCli {
        global,
        command: CliCommand::Add(AddArgs {
            title,
            project,
            status,
            memo,
            due,
            priority,
        }),
    })
}

fn parse_list(args: &[String]) -> ParseOutcome {
    let mut tokens = match tokenize(args) {
        Ok(t) => t,
        Err(e) => return ParseOutcome::Error(e),
    };
    let global = extract_global(&mut tokens.flags);

    if !tokens.positionals.is_empty() {
        return ParseOutcome::Error(format!(
            "list は位置引数を取りません: {:?}",
            tokens.positionals
        ));
    }

    let project = take_flag(&mut tokens.flags, "project");
    let status = take_flag(&mut tokens.flags, "status");

    if let Some((k, _)) = tokens.flags.first() {
        return ParseOutcome::Error(format!("list: 未知のフラグ --{k}"));
    }

    ParseOutcome::Parsed(ParsedCli {
        global,
        command: CliCommand::List(ListArgs { project, status }),
    })
}

fn parse_move(args: &[String]) -> ParseOutcome {
    let mut tokens = match tokenize(args) {
        Ok(t) => t,
        Err(e) => return ParseOutcome::Error(e),
    };
    let global = extract_global(&mut tokens.flags);

    let id = match tokens.positionals.len() {
        1 => tokens.positionals.remove(0),
        0 => return ParseOutcome::Error("move: タスクIDが必要です".into()),
        _ => {
            return ParseOutcome::Error(format!(
                "move: 位置引数が多すぎます: {:?}",
                tokens.positionals
            ))
        }
    };
    let status = match take_flag(&mut tokens.flags, "status") {
        Some(v) => v,
        None => return ParseOutcome::Error("move: --status は必須です".into()),
    };

    if let Some((k, _)) = tokens.flags.first() {
        return ParseOutcome::Error(format!("move: 未知のフラグ --{k}"));
    }

    ParseOutcome::Parsed(ParsedCli {
        global,
        command: CliCommand::Move(MoveArgs { id, status }),
    })
}

fn parse_project_add(args: &[String]) -> ParseOutcome {
    let mut tokens = match tokenize(args) {
        Ok(t) => t,
        Err(e) => return ParseOutcome::Error(e),
    };
    let global = extract_global(&mut tokens.flags);

    if !tokens.positionals.is_empty() {
        return ParseOutcome::Error(format!(
            "project add は位置引数を取りません: {:?}",
            tokens.positionals
        ));
    }

    let name = match take_flag(&mut tokens.flags, "name") {
        Some(v) => v,
        None => return ParseOutcome::Error("add: --name は必須です".into()),
    };
    let columns = take_flag(&mut tokens.flags, "columns").map(|v| {
        v.split(',').map(|s| s.trim().to_string()).collect()
    });

    if let Some((k, _)) = tokens.flags.first() {
        return ParseOutcome::Error(format!("project add: 未知のフラグ --{k}"));
    }

    ParseOutcome::Parsed(ParsedCli {
        global,
        command: CliCommand::ProjectAdd(ProjectAddArgs { name, columns }),
    })
}

fn parse_project_list(args: &[String]) -> ParseOutcome {
    let mut tokens = match tokenize(args) {
        Ok(t) => t,
        Err(e) => return ParseOutcome::Error(e),
    };
    let global = extract_global(&mut tokens.flags);

    if !tokens.positionals.is_empty() {
        return ParseOutcome::Error(format!(
            "project list は位置引数を取りません: {:?}",
            tokens.positionals
        ));
    }

    if let Some((k, _)) = tokens.flags.first() {
        return ParseOutcome::Error(format!("project list: 未知のフラグ --{k}"));
    }

    ParseOutcome::Parsed(ParsedCli {
        global,
        command: CliCommand::ProjectList,
    })
}

fn parse_project_rename(args: &[String]) -> ParseOutcome {
    let mut tokens = match tokenize(args) {
        Ok(t) => t,
        Err(e) => return ParseOutcome::Error(e),
    };
    let global = extract_global(&mut tokens.flags);

    let id = match tokens.positionals.len() {
        1 => tokens.positionals.remove(0),
        0 => return ParseOutcome::Error("rename: プロジェクトIDが必要です".into()),
        _ => {
            return ParseOutcome::Error(format!(
                "rename: 位置引数が多すぎます: {:?}",
                tokens.positionals
            ))
        }
    };
    let name = match take_flag(&mut tokens.flags, "name") {
        Some(v) => v,
        None => return ParseOutcome::Error("rename: --name は必須です".into()),
    };

    if let Some((k, _)) = tokens.flags.first() {
        return ParseOutcome::Error(format!("rename: 未知のフラグ --{k}"));
    }

    ParseOutcome::Parsed(ParsedCli {
        global,
        command: CliCommand::ProjectRename(ProjectRenameArgs { id, name }),
    })
}

fn parse_project_delete(args: &[String]) -> ParseOutcome {
    let force = args.iter().any(|a| a == "--force");
    let filtered: Vec<String> = args.iter().filter(|a| a.as_str() != "--force").cloned().collect();

    let mut tokens = match tokenize(&filtered) {
        Ok(t) => t,
        Err(e) => return ParseOutcome::Error(e),
    };
    let global = extract_global(&mut tokens.flags);

    let id = match tokens.positionals.len() {
        1 => tokens.positionals.remove(0),
        0 => return ParseOutcome::Error("delete: プロジェクトIDが必要です".into()),
        _ => {
            return ParseOutcome::Error(format!(
                "delete: 位置引数が多すぎます: {:?}",
                tokens.positionals
            ))
        }
    };

    if let Some((k, _)) = tokens.flags.first() {
        return ParseOutcome::Error(format!("delete: 未知のフラグ --{k}"));
    }

    ParseOutcome::Parsed(ParsedCli {
        global,
        command: CliCommand::ProjectDelete(ProjectDeleteArgs { id, force }),
    })
}

fn parse_done(args: &[String]) -> ParseOutcome {
    let mut tokens = match tokenize(args) {
        Ok(t) => t,
        Err(e) => return ParseOutcome::Error(e),
    };
    let global = extract_global(&mut tokens.flags);

    let id = match tokens.positionals.len() {
        1 => tokens.positionals.remove(0),
        0 => return ParseOutcome::Error("done: タスクIDが必要です".into()),
        _ => {
            return ParseOutcome::Error(format!(
                "done: 位置引数が多すぎます: {:?}",
                tokens.positionals
            ))
        }
    };

    if let Some((k, _)) = tokens.flags.first() {
        return ParseOutcome::Error(format!("done: 未知のフラグ --{k}"));
    }

    ParseOutcome::Parsed(ParsedCli {
        global,
        command: CliCommand::Done(DoneArgs { id }),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn argv(parts: &[&str]) -> Vec<String> {
        parts.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn empty_argv_is_not_cli() {
        assert_eq!(parse_args(&argv(&["app.exe"])), ParseOutcome::NotCli);
    }

    #[test]
    fn quick_flag_is_not_cli() {
        assert_eq!(
            parse_args(&argv(&["app.exe", "--quick"])),
            ParseOutcome::NotCli
        );
    }

    #[test]
    fn task_without_subcommand_shows_help() {
        match parse_args(&argv(&["app.exe", "task"])) {
            ParseOutcome::Help(_) => {}
            other => panic!("expected Help, got {other:?}"),
        }
    }

    #[test]
    fn help_flag_shows_help() {
        match parse_args(&argv(&["app.exe", "task", "--help"])) {
            ParseOutcome::Help(_) => {}
            other => panic!("expected Help, got {other:?}"),
        }
    }

    #[test]
    fn unknown_subcommand_is_error() {
        match parse_args(&argv(&["app.exe", "task", "delete"])) {
            ParseOutcome::Error(_) => {}
            other => panic!("expected Error, got {other:?}"),
        }
    }

    #[test]
    fn add_requires_title_project_status() {
        let parsed = parse_args(&argv(&[
            "app.exe", "task", "add", "--title", "T", "--project", "P", "--status", "S",
        ]));
        match parsed {
            ParseOutcome::Parsed(p) => {
                assert_eq!(
                    p.command,
                    CliCommand::Add(AddArgs {
                        title: "T".into(),
                        project: "P".into(),
                        status: "S".into(),
                        memo: None,
                        due: None,
                        priority: None,
                    })
                );
                assert_eq!(p.global.db_path, None);
            }
            other => panic!("expected Parsed, got {other:?}"),
        }
    }

    #[test]
    fn add_missing_title_errors() {
        match parse_args(&argv(&[
            "app.exe", "task", "add", "--project", "P", "--status", "S",
        ])) {
            ParseOutcome::Error(m) => assert!(m.contains("title")),
            other => panic!("expected Error, got {other:?}"),
        }
    }

    #[test]
    fn add_accepts_optional_fields() {
        let parsed = parse_args(&argv(&[
            "app.exe",
            "task",
            "add",
            "--title",
            "T",
            "--project",
            "P",
            "--status",
            "S",
            "--memo",
            "hello",
            "--due",
            "2026-05-30",
            "--priority",
            "high",
        ]));
        let ParseOutcome::Parsed(p) = parsed else {
            panic!("expected Parsed");
        };
        let CliCommand::Add(a) = p.command else {
            panic!("expected Add");
        };
        assert_eq!(a.memo.as_deref(), Some("hello"));
        assert_eq!(a.due.as_deref(), Some("2026-05-30"));
        assert_eq!(a.priority, Some(3));
    }

    #[test]
    fn priority_accepts_numeric_and_named() {
        let cases = [
            ("0", 0),
            ("none", 0),
            ("1", 1),
            ("low", 1),
            ("2", 2),
            ("med", 2),
            ("medium", 2),
            ("3", 3),
            ("HIGH", 3),
        ];
        for (input, expected) in cases {
            assert_eq!(parse_priority(input), Ok(expected), "input={input}");
        }
        assert!(parse_priority("urgent").is_err());
    }

    #[test]
    fn list_accepts_no_args() {
        match parse_args(&argv(&["app.exe", "task", "list"])) {
            ParseOutcome::Parsed(p) => {
                assert_eq!(
                    p.command,
                    CliCommand::List(ListArgs {
                        project: None,
                        status: None
                    })
                );
            }
            other => panic!("got {other:?}"),
        }
    }

    #[test]
    fn list_accepts_project_and_status() {
        match parse_args(&argv(&[
            "app.exe", "task", "list", "--project", "開発", "--status", "Todo",
        ])) {
            ParseOutcome::Parsed(p) => {
                assert_eq!(
                    p.command,
                    CliCommand::List(ListArgs {
                        project: Some("開発".into()),
                        status: Some("Todo".into()),
                    })
                );
            }
            other => panic!("got {other:?}"),
        }
    }

    #[test]
    fn move_requires_id_and_status() {
        let parsed = parse_args(&argv(&[
            "app.exe", "task", "move", "01HXX", "--status", "In Progress",
        ]));
        match parsed {
            ParseOutcome::Parsed(p) => {
                assert_eq!(
                    p.command,
                    CliCommand::Move(MoveArgs {
                        id: "01HXX".into(),
                        status: "In Progress".into(),
                    })
                );
            }
            other => panic!("got {other:?}"),
        }
    }

    #[test]
    fn move_without_id_errors() {
        match parse_args(&argv(&["app.exe", "task", "move", "--status", "Done"])) {
            ParseOutcome::Error(_) => {}
            other => panic!("got {other:?}"),
        }
    }

    #[test]
    fn move_without_status_errors() {
        match parse_args(&argv(&["app.exe", "task", "move", "01HXX"])) {
            ParseOutcome::Error(_) => {}
            other => panic!("got {other:?}"),
        }
    }

    #[test]
    fn done_requires_only_id() {
        match parse_args(&argv(&["app.exe", "task", "done", "01HXX"])) {
            ParseOutcome::Parsed(p) => {
                assert_eq!(p.command, CliCommand::Done(DoneArgs { id: "01HXX".into() }));
            }
            other => panic!("got {other:?}"),
        }
    }

    #[test]
    fn done_without_id_errors() {
        match parse_args(&argv(&["app.exe", "task", "done"])) {
            ParseOutcome::Error(_) => {}
            other => panic!("got {other:?}"),
        }
    }

    #[test]
    fn global_db_flag_is_extracted() {
        let parsed = parse_args(&argv(&[
            "app.exe", "task", "list", "--db", "/tmp/test.db",
        ]));
        match parsed {
            ParseOutcome::Parsed(p) => {
                assert_eq!(p.global.db_path.as_deref(), Some("/tmp/test.db"));
            }
            other => panic!("got {other:?}"),
        }
    }

    #[test]
    fn unknown_flag_errors() {
        match parse_args(&argv(&[
            "app.exe", "task", "add", "--title", "T", "--project", "P", "--status", "S", "--xyz",
            "v",
        ])) {
            ParseOutcome::Error(m) => assert!(m.contains("xyz")),
            other => panic!("got {other:?}"),
        }
    }

    #[test]
    fn is_cli_argv_detects_task_subcommand() {
        assert!(is_cli_argv(&argv(&["app.exe", "task"])));
        assert!(is_cli_argv(&argv(&["app.exe", "task", "--help"])));
        assert!(is_cli_argv(&argv(&["app.exe", "task", "list"])));
    }

    #[test]
    fn is_cli_argv_false_for_gui() {
        assert!(!is_cli_argv(&argv(&["app.exe"])));
        assert!(!is_cli_argv(&argv(&["app.exe", "--quick"])));
    }

    #[test]
    fn flag_without_value_errors() {
        match parse_args(&argv(&["app.exe", "task", "add", "--title"])) {
            ParseOutcome::Error(_) => {}
            other => panic!("got {other:?}"),
        }
    }

    // ── project サブコマンド ──

    #[test]
    fn is_cli_argv_detects_project_subcommand() {
        assert!(is_cli_argv(&argv(&["app.exe", "project"])));
        assert!(is_cli_argv(&argv(&["app.exe", "project", "--help"])));
        assert!(is_cli_argv(&argv(&["app.exe", "project", "list"])));
    }

    #[test]
    fn project_help_flag_shows_help() {
        match parse_args(&argv(&["app.exe", "project", "--help"])) {
            ParseOutcome::Help(msg) => assert!(msg.contains("project")),
            other => panic!("expected Help, got {other:?}"),
        }
    }

    #[test]
    fn project_without_subcommand_shows_help() {
        match parse_args(&argv(&["app.exe", "project"])) {
            ParseOutcome::Help(_) => {}
            other => panic!("expected Help, got {other:?}"),
        }
    }

    #[test]
    fn project_unknown_subcommand_is_error() {
        match parse_args(&argv(&["app.exe", "project", "unknown"])) {
            ParseOutcome::Error(_) => {}
            other => panic!("expected Error, got {other:?}"),
        }
    }

    #[test]
    fn project_add_with_name() {
        let parsed = parse_args(&argv(&["app.exe", "project", "add", "--name", "開発"]));
        match parsed {
            ParseOutcome::Parsed(p) => {
                assert_eq!(
                    p.command,
                    CliCommand::ProjectAdd(ProjectAddArgs {
                        name: "開発".into(),
                        columns: None,
                    })
                );
            }
            other => panic!("expected Parsed, got {other:?}"),
        }
    }

    #[test]
    fn project_add_with_columns() {
        let parsed = parse_args(&argv(&[
            "app.exe", "project", "add", "--name", "X", "--columns", "A,B,C",
        ]));
        match parsed {
            ParseOutcome::Parsed(p) => {
                let CliCommand::ProjectAdd(a) = p.command else {
                    panic!("expected ProjectAdd");
                };
                assert_eq!(a.columns, Some(vec!["A".into(), "B".into(), "C".into()]));
            }
            other => panic!("expected Parsed, got {other:?}"),
        }
    }

    #[test]
    fn project_add_missing_name_errors() {
        match parse_args(&argv(&["app.exe", "project", "add"])) {
            ParseOutcome::Error(m) => assert!(m.contains("--name")),
            other => panic!("expected Error, got {other:?}"),
        }
    }

    #[test]
    fn project_list_parses() {
        match parse_args(&argv(&["app.exe", "project", "list"])) {
            ParseOutcome::Parsed(p) => {
                assert_eq!(p.command, CliCommand::ProjectList);
            }
            other => panic!("expected Parsed, got {other:?}"),
        }
    }

    #[test]
    fn project_rename_parses() {
        let parsed = parse_args(&argv(&[
            "app.exe", "project", "rename", "01JXXX", "--name", "新名前",
        ]));
        match parsed {
            ParseOutcome::Parsed(p) => {
                assert_eq!(
                    p.command,
                    CliCommand::ProjectRename(ProjectRenameArgs {
                        id: "01JXXX".into(),
                        name: "新名前".into(),
                    })
                );
            }
            other => panic!("expected Parsed, got {other:?}"),
        }
    }

    #[test]
    fn project_rename_missing_id_errors() {
        match parse_args(&argv(&["app.exe", "project", "rename", "--name", "Y"])) {
            ParseOutcome::Error(_) => {}
            other => panic!("expected Error, got {other:?}"),
        }
    }

    #[test]
    fn project_rename_missing_name_errors() {
        match parse_args(&argv(&["app.exe", "project", "rename", "01JXXX"])) {
            ParseOutcome::Error(m) => assert!(m.contains("--name")),
            other => panic!("expected Error, got {other:?}"),
        }
    }

    #[test]
    fn project_delete_without_force() {
        let parsed = parse_args(&argv(&["app.exe", "project", "delete", "01JXXX"]));
        match parsed {
            ParseOutcome::Parsed(p) => {
                assert_eq!(
                    p.command,
                    CliCommand::ProjectDelete(ProjectDeleteArgs {
                        id: "01JXXX".into(),
                        force: false,
                    })
                );
            }
            other => panic!("expected Parsed, got {other:?}"),
        }
    }

    #[test]
    fn project_delete_with_force() {
        let parsed = parse_args(&argv(&[
            "app.exe", "project", "delete", "01JXXX", "--force",
        ]));
        match parsed {
            ParseOutcome::Parsed(p) => {
                assert_eq!(
                    p.command,
                    CliCommand::ProjectDelete(ProjectDeleteArgs {
                        id: "01JXXX".into(),
                        force: true,
                    })
                );
            }
            other => panic!("expected Parsed, got {other:?}"),
        }
    }

    #[test]
    fn project_delete_missing_id_errors() {
        match parse_args(&argv(&["app.exe", "project", "delete"])) {
            ParseOutcome::Error(_) => {}
            other => panic!("expected Error, got {other:?}"),
        }
    }

    #[test]
    fn project_global_db_flag() {
        let parsed = parse_args(&argv(&[
            "app.exe", "project", "list", "--db", "/tmp/test.db",
        ]));
        match parsed {
            ParseOutcome::Parsed(p) => {
                assert_eq!(p.global.db_path.as_deref(), Some("/tmp/test.db"));
            }
            other => panic!("expected Parsed, got {other:?}"),
        }
    }
}
