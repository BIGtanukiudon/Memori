# 06. クイック入力ウィンドウのログモード

Status: needs-info
依存: 01, 02
PRD: `.scratch/worklog/PRD.md` §6-2

## 未確認事項（着手前に確定させる）

**対象タスクの指定方法**が未決。PRD §6-2 の推奨案は
「インクリメンタル検索で選択、既定値は直近ログを書いたタスク」。
確定するまで着手しないこと。

代替案として「作業中タスク」という新しいドメイン概念を導入する案もあるが、
その場合は本 issue のスコープを超えるため別 PRD に切り直す。

## 目的

手動記録は入力が面倒だと続かない。ホットキー一発で追記できる導線が
実質的にこの機能の生死を決める。

## 変更対象

- `src-tauri/src/lib.rs`（argv 分岐）
- `src/QuickApp.tsx`
- `src/components/QuickLogDialog.tsx`（新規）
- `src/lib/events.ts`
- `src/data/useBoardSync.ts`

## 仕様

### 起動

- `app.exe --quick-log` を追加する。AHK で `--quick` とは別ホットキーに割り当てる
- 既存の `--quick`（タスク追加）の挙動は**一切変えない**
- Rust 側 `setup()` の argv 分岐に追加し、`quick` ウィンドウをログモードで表示する
- 既存同様、×ボタンはクローズせず `hide()` のみ。表示ごとに入力状態をリセット

### 入力

- 対象タスク欄（既定値は直近ログを書いたタスク）＋本文欄
- 本文にフォーカスした状態で開く。そのまま打って `Ctrl+Enter` で確定 → `hide()`
- `Esc` でキャンセルして `hide()`
- 対象タスクが1件も決まらない場合（ログ履歴なし）は検索必須

### ウィンドウ間同期

`src/lib/events.ts` に追加:

| イベント | ペイロード | 用途 |
|---|---|---|
| `worklog:added` | `{ taskId, projectId }` | メインウィンドウ側の表示を更新 |

`EVENT_NAMES` / `emitWorkLogAdded` / `listenWorkLogAdded` を既存の書き方に合わせて追加し、
`useBoardSync` で購読する。

## テスト観点（TDD）

- 既定の対象タスクが入った状態で開く
- 検索で対象タスクを切り替えられる
- `Ctrl+Enter` で追加され、ウィンドウが hide される
- `Esc` でキャンセルされ、何も追加されない
- 空白のみの本文では確定できない
- 再表示時に前回の入力が残っていない
- `worklog:added` が emit される

## 完了条件

`pnpm test` / `cargo test` が緑。ホットキーからの追記が実機で動く。
