# 05. CLI: `log list` サブコマンド

Status: ready-for-agent
依存: 01（テーブル）, 04（日付変換）
PRD: `.scratch/worklog/PRD.md` §7-1

## 目的

「今日の日報作って」の一言で AI が材料を取得できるようにする。
本機能の主目的そのもの。

## 変更対象

- `src-tauri/src/cli/args.rs`
- `src-tauri/src/cli/db.rs`
- `src-tauri/src/cli/output.rs`
- `src-tauri/src/cli/mod.rs`

## 仕様

```
app.exe log list [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--project <名前またはID>]
app.exe log --help
```

- 既存の `task` / `project` と並ぶ**第3のトップレベルサブコマンド** `log` を追加する
- `--from` / `--to` 省略時は**今日**（ローカル日付）。片方だけの指定も許す
- `--project` は既存 `task list` の解決ロジックに合わせる（名前 or ID）

### クエリ

`work_logs` を `LEFT JOIN tasks` し、表示名は
`COALESCE(t.title, wl.task_title)`。`t.id IS NULL` なら削除済みタスク。
プロジェクト名も同様に `projects` と `LEFT JOIN` する。

並び順: プロジェクト → タスク → `created_at` 昇順。

### 出力（Markdown）

用途が「AI に読ませる」に限定されるため、既存のテーブル形式ではなく Markdown。

```markdown
# 作業ログ 2026-08-30

## 開発

### API のリトライ処理を実装
- 09:15 仕様を確認。既存の指数バックオフを流用できそう
- 11:40 実装完了。タイムアウト時のテストが1件落ちる

### DBマイグレーション整理 (削除済み)
- 14:02 004 に統合して不要になったので削除
```

- 見出しの日付は単日なら `2026-08-30`、複数日なら `2026-08-25 〜 2026-08-30`
- 時刻は**ローカル時刻**の `HH:mm`。複数日にまたがる場合は `MM/DD HH:mm`
- 本文に改行が含まれる場合、2行目以降はインデントしてリスト項目を維持する
- 該当なしのときは `(該当する作業ログなし)`（既存 CLI の慣習）

## テスト観点（TDD）

- args: `log list` の各フラグ解析、未知フラグのエラー、`--help` の終了コード 0
- output: 0件・単日・複数日・削除済みタスク混在・改行を含む本文
- db + E2E: プロジェクト作成 → タスク作成 → ログ追加 → `log list` で拾える
- 期間外のログが出力に含まれない（境界を1件ずつ置いて検証）

## 完了条件

`cargo test` が緑。実際に `app.exe log list` で Markdown が出る。
