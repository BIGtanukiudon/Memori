# Memori

Windowsデスクトップ向けのカンバンタスク管理ツール。プロジェクト／タスクの2階層管理、カスタマイズ可能なカンバンボード、AHK連携によるグローバルショートカットからのクイック入力をサポートします。

> **Memori** は「メモり」と「memory」をかけた名前です。気軽にメモするように、記憶として残るタスク管理を目指しています。

## 主な機能

- **カンバンボード**: プロジェクト単位の列（ステータス）管理とカードのドラッグ&ドロップ
- **タスク詳細編集**: タイトル・メモ・期日・優先度をモーダルで編集
- **クイック入力ウィンドウ**: `app.exe --quick` で呼び出せる軽量入力ウィンドウ（AHK等のホットキーから利用）
- **全タスク一覧ビュー**: プロジェクト横断でフィルタ・ソート可能なリストビュー
- **シングルインスタンス制御**: 2重起動を防ぎ、既存プロセスへ argv を受け渡し
- **CLIサブコマンド**: `app.exe task add/list/move/done` でAIエージェント（Claude Code等）や任意スクリプトからタスク操作

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
| `projects` | `id`, `name`, `created_at`, `updated_at` | プロジェクト（大項目） |
| `columns`  | `id`, `project_id`, `name`, `position` | カンバンの列（ステータス）。`project_id` に対し `ON DELETE CASCADE` |
| `tasks`    | `id`, `project_id`, `column_id`, `title`, `memo`, `due_date`, `priority`, `position`, `created_at`, `updated_at` | `column_id` に対し `ON DELETE CASCADE`。`priority` は `0:なし / 1:低 / 2:中 / 3:高` |

DDL本体は [`src-tauri/migrations/001_init.sql`](./src-tauri/migrations/001_init.sql)。並び順は同列内 `position` を 0始まりで再採番するシンプル方式。

## ウィンドウ構成

| ウィンドウ | label | 用途 | サイズ | 常に前面 |
|---|---|---|---|---|
| メイン | `main` | カンバンボード本体 | 1200×800（可変） | No |
| クイック入力 | `quick` | `--quick` で呼び出される軽量入力 | 400×250 | Yes |

両ウィンドウは初期 `visible=false` で起動し、Rust側 `setup()` がargvに応じて該当ウィンドウを `show()` + `set_focus()` します。クイック入力ウィンドウは毎回 `hide()`/`show()` で使い回し、入力フォーム状態は表示ごとにリセット。

- **メインウィンドウ ×ボタン**: アプリ全体を終了 (`app.exit(0)`)。プロセスが残らないため、再起動時に single-instance 制御で起動できなくなる問題を防ぎます。
- **クイック入力ウィンドウ ×ボタン**: クローズを抑止して `hide()` のみ実行。再度 `--quick` で呼び出された際に即座に再表示できます。

## ウィンドウ間同期

クイック入力ウィンドウ→メインウィンドウの反映は Tauri の `emit` / `listen` で行います。

| イベント | ペイロード | 用途 |
|---|---|---|
| `task:created` | `{ task_id, project_id }` | メイン側ストアへ新規タスク追加 |
| `task:updated` | `{ task_id, project_id }` | 該当タスク更新 |
| `task:deleted` | `{ task_id, project_id }` | 該当タスク除外 |
| `project:changed` | `{ project_id }` | 列構成・プロジェクト一覧の再フェッチ |

**CLI / 外部からのDB直接更新**はウィンドウ間イベントを発火しないため、メインウィンドウのフォーカス復帰時に再フェッチして同期します。

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
^+Space::  ; Ctrl+Shift+Space
  Run, "C:\path\to\app.exe" --quick
return
```

すでに起動済みの場合は既存プロセスのクイック入力ウィンドウがフォーカスされます（シングルインスタンス制御）。

## CLI（`app.exe task ...`）

AIエージェントや任意スクリプトから操作するためのサブコマンドです。`task` サブコマンドが含まれる場合はGUIを起動せず、SQLiteを直接読み書きして即終了します。GUI起動中でも安全に併用できます（SQLiteは同時アクセス可）。

```bash
# タスクを追加（タイトル・プロジェクト名・列名は必須、--memo / --due / --priority は任意）
app.exe task add --title "認証バグ修正" --project "開発" --status "Todo" \
                 --priority high --due 2026-05-30

# タスク一覧（--project / --status で絞り込み可、いずれも省略可）
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
| 9 | CLIサブコマンド (`app.exe task add/list/move/done`) | ✅ |
| 10 | MCPサーバー実装 | 未着手 |

## ライセンス

未定。
