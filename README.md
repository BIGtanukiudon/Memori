# Memori

Windowsデスクトップ向けのカンバンタスク管理ツール。プロジェクト／タスクの2階層管理、カスタマイズ可能なカンバンボード、AHK連携によるグローバルショートカットからのクイック入力をサポートします。

> **Memori** は「メモり」と「memory」をかけた名前です。気軽にメモするように、記憶として残るタスク管理を目指しています。

## 主な機能

- **カンバンボード**: プロジェクト単位の列（ステータス）管理とカードのドラッグ&ドロップ
- **完了列**: 任意のカラムを「完了列」に指定可能。タスクが完了列に移動すると完了日時を自動記録
- **プロジェクト並び替え**: サイドバーの上下ボタンでプロジェクトの表示順を変更
- **タスク詳細編集**: タイトル・メモ・期日・優先度をモーダルで編集
- **クイック入力ウィンドウ**: `app.exe --quick` で呼び出せる軽量入力ウィンドウ（AHK等のホットキーから利用）
- **全タスク一覧ビュー**: プロジェクト横断でフィルタ・ソート可能なリストビュー
- **作業ログ**: タスクに対して時系列で作業記録を書き足せる。タスク詳細モーダルから追加・編集・削除。`app.exe --quick-log` の軽量ウィンドウからも追記可能。日報・週報の材料としてCLI経由でAIに読ませることを主目的とする
- **シングルインスタンス制御**: 2重起動を防ぎ、既存プロセスへ argv を受け渡し
- **CLIサブコマンド**: `app.exe task add/list/move/done`、`app.exe project add/list/rename/delete`、`app.exe log list` でAIエージェント（Claude Code等）や任意スクリプトからタスク・プロジェクト・作業ログ操作

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Tauri v2 |
| UI | React 18 + TypeScript |
| スタイル | Tailwind CSS |
| 状態管理 | Zustand |
| D&D | @dnd-kit/core |
| DB | SQLite（tauri-plugin-sql） |
| ID | ULID |
| テスト | Vitest + Testing Library |
| パッケージマネージャー | pnpm |

## ディレクトリ構成

```
memori/
├── src/                  React + TypeScriptフロントエンド
│   ├── components/       UIコンポーネント（カンバン・モーダル・クイック入力）
│   ├── store/            Zustandストア・セレクタ
│   ├── db/               tauri-plugin-sql経由のDBアクセス層
│   ├── lib/              ユーティリティ関数
│   ├── types/            型定義
│   ├── App.tsx           メインウィンドウのエントリ
│   └── QuickApp.tsx      クイック入力ウィンドウのエントリ
├── src-tauri/            Tauri (Rust) 側
│   ├── src/              シングルインスタンス制御・ウィンドウ管理
│   │   └── cli/          CLIサブコマンド (args / db / output / dispatch)
│   └── migrations/       SQLiteマイグレーション
└── tests/                テストセットアップ・ヘルパー
```

## データモデル

SQLite上の主要テーブル（IDはすべてULID／TEXT）:

| テーブル | 主なカラム | 補足 |
|---|---|---|
| `projects` | `id`, `name`, `position`, `done_column_id`, `created_at`, `updated_at` | プロジェクト（大項目）。`position` で表示順を管理。`done_column_id` は完了列（nullable、最大1つ） |
| `columns`  | `id`, `project_id`, `name`, `position` | カンバンの列（ステータス）。`project_id` に対し `ON DELETE CASCADE` |
| `tasks`    | `id`, `project_id`, `column_id`, `title`, `memo`, `due_date`, `priority`, `position`, `completed_at`, `created_at`, `updated_at` | `column_id` に対し `ON DELETE CASCADE`。`priority` は `0:なし / 1:低 / 2:中 / 3:高`。`completed_at` は完了列移動時に自動記録 |
| `work_logs` | `id`, `task_id`, `project_id`, `body`, `task_title`, `project_name`, `created_at`, `updated_at` | タスクに対する時系列の作業記録。`task_id` / `project_id` に**外部キーを張らない**（タスク削除後も日報の材料として残すため）。`task_title` / `project_name` は記録時点のスナップショットで、表示時は現存タスク・プロジェクトの名前を優先し、無ければスナップショットにフォールバックする |

DDL本体は [`src-tauri/migrations/001_init.sql`](./src-tauri/migrations/001_init.sql)。完了列関連は [`003_done_column.sql`](./src-tauri/migrations/003_done_column.sql)。作業ログは [`004_work_logs.sql`](./src-tauri/migrations/004_work_logs.sql)（設計判断の詳細は [ADR-0002](./docs/adr/0002-worklog-survives-task-deletion.md)）。並び順は同列内 `position` を 0始まりで再採番するシンプル方式。

## ウィンドウ構成

| ウィンドウ | label | 用途 | サイズ | 常に前面 |
|---|---|---|---|---|
| メイン | `main` | カンバンボード本体 | 1200×800（可変） | No |
| クイック入力 | `quick` | `--quick`（タスク追加）/ `--quick-log`（作業ログ追加）で呼び出される軽量入力 | 400×250 | Yes |

両ウィンドウは初期 `visible=false` で起動し、Rust側 `setup()` がargvに応じて該当ウィンドウを `show()` + `set_focus()` します。クイック入力ウィンドウは毎回 `hide()`/`show()` で使い回し、入力フォーム状態は表示ごとにリセット。

- **メインウィンドウ ×ボタン**: アプリ全体を終了 (`app.exit(0)`)。プロセスが残らないため、再起動時に single-instance 制御で起動できなくなる問題を防ぎます。
- **クイック入力ウィンドウ ×ボタン**: クローズを抑止して `hide()` のみ実行。再度 `--quick` / `--quick-log` で呼び出された際に即座に再表示できます。

### クイックウィンドウのモード切替（`--quick` / `--quick-log`）

`quick` ウィンドウは1つのまま、起動argvに応じて中身（タスク追加フォーム／作業ログ追加フォーム）を切り替えます。`is_quick_invocation` と `is_quick_log_invocation`（[`src-tauri/src/lib.rs`](./src-tauri/src/lib.rs)）は完全一致比較のため互いに前方一致で誤爆しません。

モードの判定をJS側へ伝える経路は2つあります。

- `get_quick_mode` コマンド: `QuickApp` のマウント時に一度呼び出し、現在のモードを確実に取得する（起動直後はイベントのlisten登録が間に合わない可能性があるため）
- `quick:mode` イベント: ウィンドウがすでに開いている状態で再度 `--quick` / `--quick-log` が実行された場合に、モード切り替えとフォームリセットをその場で反映する

作業ログモードの対象タスクは `getLastLoggedTaskId`（[`src/db/workLogs.ts`](./src/db/workLogs.ts)）で直近ログの対象タスクを既定値にします。対象タスクが削除済みの場合は現存する直近のタスクまで遡り、それでも見つからなければ対象タスク欄にフォーカスして選択を必須にします。対象タスクの検索候補は `searchTasksForLog`（[`src/db/tasks.ts`](./src/db/tasks.ts)）が全プロジェクト横断・完了タスクも含む（未完了が先）形で最大20件返します。

## ウィンドウ間同期

クイック入力ウィンドウ→メインウィンドウの反映は Tauri の `emit` / `listen` で行います。

| イベント | ペイロード | 用途 |
|---|---|---|
| `task:created` | `{ task_id, project_id }` | メイン側ストアへ新規タスク追加 |
| `task:updated` | `{ task_id, project_id }` | 該当タスク更新 |
| `task:deleted` | `{ task_id, project_id }` | 該当タスク除外 |
| `project:changed` | `{ project_id }` | 列構成・プロジェクト一覧の再フェッチ |
| `worklog:added` | `{ task_id, project_id }` | クイックログウィンドウでの追記をメインウィンドウ側へ反映（`useBoardSync` の `onWorkLogAdded` で購読） |
| `quick:mode` | `{ mode: "task" \| "log" }` | Rust側からquickウィンドウの表示モードをJSへ通知（`--quick` / `--quick-log` の起動・再表示のたびに送信） |

**CLI / 外部からのDB直接更新**はウィンドウ間イベントを発火しないため、メインウィンドウのフォーカス復帰時に再フェッチして同期します。

## 完了列

プロジェクトごとに1つのカラムを「完了列」として指定できます。

- **設定/解除**: カラムヘッダーの ○ ボタンで完了列に設定。設定済みの列は ✓ ボタンで解除
- **completedAt 自動記録**: タスクを完了列にドラッグ&ドロップすると `completed_at` に現在時刻が記録される。完了列から別の列に戻すと `completed_at` は `null` にリセット
- **完了列の削除**: 完了列として指定中のカラムを削除すると、プロジェクトの `done_column_id` は自動的に `null` に戻る
- **カード見た目**: 完了タスクのカード外見は通常タスクと同じ（視覚的区別なし）

## セットアップ

依存パッケージのインストール:

```bash
pnpm install
```

> **Note**: 本プロジェクトでは npm / yarn ではなく **pnpm** を使用します。

## 開発

```bash
# Vite開発サーバー（ブラウザ確認用）
pnpm dev

# Tauri開発モード（デスクトップアプリとして起動）
pnpm tauri:dev

# クイック入力ウィンドウを起動時に前面表示
pnpm tauri:dev:quick

# クイック入力ウィンドウを作業ログ追加モードで起動時に前面表示
pnpm tauri:dev:quick-log
```

## ビルド

```bash
# フロントエンドのみビルド
pnpm build

# Tauriアプリ（Windowsインストーラ等）のビルド
pnpm tauri build
```

## テスト

本プロジェクトは TDD で機能実装を進めています。

```bash
# テスト実行（ワンショット）
pnpm test

# ウォッチモード
pnpm test:watch

# カバレッジ計測
pnpm test:coverage

# 型チェック
pnpm lint

# Rust側テスト（CLI含む、Windows推奨）
cd src-tauri && cargo test --lib
```

### カバレッジ目標

| 対象 | 目標 |
|---|---|
| Zustandストア | 90%以上 |
| ユーティリティ関数 | 100% |
| DBアクセス関数 | 80%以上 |
| Reactコンポーネント | 60%以上 |

## AHK連携

AutoHotKeyからグローバルショートカットでクイック入力を呼び出せます。

```ahk
^+Space::  ; Ctrl+Shift+Space: タスク追加
  Run, "C:\path\to\app.exe" --quick
return

^+L::  ; Ctrl+Shift+L: 作業ログ追加
  Run, "C:\path\to\app.exe" --quick-log
return
```

すでに起動済みの場合は既存プロセスのクイック入力ウィンドウがフォーカスされます（シングルインスタンス制御）。`--quick` と `--quick-log` は別ホットキーに割り当ててください（同じ `quick` ウィンドウがモードだけ切り替わって再表示されます）。

## CLI（`app.exe task ...`）

AIエージェントや任意スクリプトから操作するためのサブコマンドです。`task` サブコマンドが含まれる場合はGUIを起動せず、SQLiteを直接読み書きして即終了します。GUI起動中でも安全に併用できます（SQLiteは同時アクセス可）。

```bash
# タスクを追加（タイトル・プロジェクト名・列名は必須、--memo / --due / --priority は任意）
app.exe task add --title "認証バグ修正" --project "開発" --status "Todo" \
                 --priority high --due 2026-05-30

# タスク一覧（--project / --status で絞り込み可、いずれも省略可）
# 出力列: ID, PROJECT, STATUS, PRIO, DUE, DONE(完了日時), TITLE
app.exe task list --project "開発"
app.exe task list --status "Todo"

# 列（ステータス）を変更
app.exe task move 01HXX... --status "In Progress"

# Done 列に移動（`move <id> --status Done` のエイリアス）
app.exe task done 01HXX...

# 任意のSQLiteパスを指定（テスト用）
app.exe task list --db /tmp/test.db

# ヘルプ
app.exe task --help
```

| サブコマンド | 必須引数 | 任意引数 |
|---|---|---|
| `add`  | `--title` / `--project` / `--status` | `--memo` / `--due YYYY-MM-DD` / `--priority {0-3\|none\|low\|med\|high}` |
| `list` | （なし） | `--project` / `--status` |
| `move` | `<id>` / `--status` | — |
| `done` | `<id>` | — |

**DBパス**: 既定では `tauri-plugin-sql` と同じ `<config_dir>/com.memori.app/kanban.db` を参照します（Windows: `%APPDATA%\com.memori.app\kanban.db`）。GUI起動前に DBファイルが存在しない場合はGUIを一度起動してマイグレーションを通してください。

**ウィンドウ同期との関係**: 上記「ウィンドウ間同期」セクションの通り、CLI更新ではイベント発火しません。GUI側はフォーカス復帰で再フェッチして反映します。

## CLI（`app.exe project ...`）

プロジェクトの作成・一覧・名前変更・削除をCLIから行えます。`task` サブコマンドと同様、GUIを起動せずSQLiteを直接操作します。

```bash
# プロジェクト作成（デフォルト列: Todo, In Progress, Done）
app.exe project add --name "開発"

# カスタム列でプロジェクト作成
app.exe project add --name "企画" --columns "アイデア,検討中,採用,却下"

# プロジェクト一覧
app.exe project list

# プロジェクト名変更
app.exe project rename 01JXXX... --name "バックエンド開発"

# プロジェクト削除（タスクがなければ即削除）
app.exe project delete 01JXXX...

# タスクがあっても強制削除
app.exe project delete 01JXXX... --force

# ヘルプ
app.exe project --help
```

| サブコマンド | 必須引数 | 任意引数 |
|---|---|---|
| `add`    | `--name` | `--columns <C1,C2,...>`（省略時はデフォルト3列） |
| `list`   | （なし） | — |
| `rename` | `<id>` / `--name` | — |
| `delete` | `<id>` | `--force`（タスクありでも強制削除） |

## CLI（`app.exe log ...`）

作業ログを期間指定でMarkdown出力します。「今日の日報作って」の一言でAIエージェントが `log list` を叩いて要約できることを主目的としています。`task` / `project` と同様、GUIを起動せずSQLiteを直接読み取ります。

```bash
# 今日の作業ログ（--from / --to 省略時はローカル日付の今日）
app.exe log list

# 期間指定（ローカル日付。--from のみ／--to のみも可）
app.exe log list --from 2026-08-25 --to 2026-08-30

# プロジェクトで絞り込み（名前またはID）
app.exe log list --project "開発"

# ヘルプ
app.exe log --help
```

| サブコマンド | 必須引数 | 任意引数 |
|---|---|---|
| `list` | （なし） | `--from YYYY-MM-DD` / `--to YYYY-MM-DD` / `--project <名前またはID>` |

出力例:

```markdown
# 作業ログ 2026-08-30

## 開発

### APIのリトライ処理を実装
- 09:15 仕様を確認。既存の指数バックオフを流用できそう
- 11:40 実装完了。タイムアウト時のテストが1件落ちる

### DBマイグレーション整理 (削除済み)
- 14:02 004に統合して不要になったので削除
```

該当する作業ログが無い場合は `(該当する作業ログなし)` を出力します。`--from` / `--to` はローカル日付として受け取り、内部でUTCの半開区間に変換して比較するため、JST日付境界（00:00〜09:00）の記録が前日扱いになる問題はありません（[`cli/date_range.rs`](./src-tauri/src/cli/date_range.rs)）。

## 実装ステータス

| # | 内容 | 状態 |
|---|---|---|
| 1 | Tauriプロジェクト初期化 + SQLiteセットアップ | ✅ |
| 2 | DBスキーマ・マイグレーション | ✅ |
| 3 | メインウィンドウ — カンバンボード基本表示 | ✅ |
| 4 | プロジェクト管理・列カスタマイズ | ✅ |
| 5 | タスクD&D・詳細編集 | ✅ |
| 6 | クイック入力ウィンドウ | ✅ |
| 7 | シングルインスタンス制御 + AHK連携 | ✅ |
| 8 | 全タスク一覧ビュー | ✅ |
| 9 | CLIサブコマンド (`app.exe task ...` / `app.exe project ...` / `app.exe log ...`) | ✅ |
| 10 | 完了列機能（カラムを完了列に指定、タスク移動時に `completedAt` 自動記録） | ✅ |
| 11 | 作業ログ（タスク詳細モーダルでの追加・編集・削除、`app.exe log list` によるMarkdown出力） | ✅ |
| 12 | 作業ログ: クイック入力ウィンドウのログモード（`--quick-log`） | ✅ |
| 13 | 作業ログ: アプリ内タイムラインビュー | 未着手 |
| 14 | MCPサーバー実装 | 未着手 |

## ライセンス

未定。
