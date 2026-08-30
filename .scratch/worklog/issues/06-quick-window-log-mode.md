# 06. クイック入力ウィンドウのログモード

Status: ready-for-agent
依存: 01, 02
PRD: `.scratch/worklog/PRD.md` §6-2

## 目的

手動記録は入力が面倒だと続かない。ホットキー一発で追記できる導線が
実質的にこの機能の生死を決める。

## 変更対象

- `src/db/workLogs.ts`（`getLastLoggedTaskId` 追加）
- `src/db/tasks.ts`（`searchTasksForLog` 追加）
- `src-tauri/src/lib.rs`（argv 分岐）
- `src/QuickApp.tsx`
- `src/components/QuickLogDialog.tsx`（新規）
- `src/lib/events.ts`
- `src/data/useBoardSync.ts`

## 仕様

### DB 層（先に片付ける）

```ts
// src/db/workLogs.ts
// 直近ログの対象タスク ID。ログが無い、または対象タスクが削除済みなら null。
export async function getLastLoggedTaskId(db: Db): Promise<string | null>;
```

`work_logs` を `created_at` 降順に見て、`tasks` に**現存する**タスクを指す
最初の1件を返す。削除済みタスクのログを掴んで null を返して終わらないこと
（＝「最新1件だけ見て存在チェック」ではなく、現存するものを探しに行く）。

```ts
// src/db/tasks.ts
export interface TaskSearchResult {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  completedAt: string | null;
}
// query が空文字なら「直近ログ順」で返す。それ以外はタイトル部分一致。
export async function searchTasksForLog(db: Db, query: string): Promise<TaskSearchResult[]>;
```

- 全プロジェクト横断
- **完了タスクも含める**。並びは未完了が先、完了が後。
  完了判定は `tasks.completed_at IS NOT NULL`
- 上限 20 件
- 部分一致は大文字小文字を区別しない

### 起動

- `app.exe --quick-log` を追加する。AHK で `--quick` とは別ホットキーに割り当てる
- 既存の `--quick`（タスク追加）の挙動は**一切変えない**。
  `--quick-log` が `is_quick_invocation` に誤ってマッチしないこと（前方一致事故に注意）
- Rust 側 `setup()` の argv 分岐に追加し、`quick` ウィンドウをログモードで表示する
- 既存同様、×ボタンはクローズせず `hide()` のみ。表示ごとに入力状態をリセット

### 入力 UI

上段に対象タスク欄（コンボボックス）、下段に本文 textarea。

- 対象タスク欄は**常時表示**。表示形式は `プロジェクト名 / タスク名`
- 既定値は `getLastLoggedTaskId()` の結果
- **フォーカスは本文欄**に当てて開く。そのまま打って `Ctrl+Enter` で確定 → `hide()`
- 対象タスク欄はクリックまたは `Shift+Tab` で移動。文字入力で候補リストが開き、
  `↑↓` で選択、`Enter` で確定
- 既定が決まらない場合（ログ履歴なし／既定タスクが削除済み）は
  **対象タスク欄にフォーカスして開く**
- `Esc` でキャンセルして `hide()`
- 本文が空白のみ、または対象タスク未選択では確定できない

### ウィンドウ間同期

`src/lib/events.ts` に追加:

| イベント | ペイロード | 用途 |
|---|---|---|
| `worklog:added` | `{ taskId, projectId }` | メインウィンドウ側の表示を更新 |

`EVENT_NAMES` / `emitWorkLogAdded` / `listenWorkLogAdded` を既存の書き方に合わせて追加し、
`useBoardSync` で購読する。

## テスト観点（TDD）

DB 層:

- `getLastLoggedTaskId` がログ0件で null を返す
- 直近ログの対象タスクを返す
- **直近ログの対象タスクが削除済みのとき、その次に新しい現存タスクを返す**
- `searchTasksForLog` が空クエリで直近ログ順に返す
- 部分一致で絞り込める（大文字小文字を区別しない）
- 完了タスクが候補に含まれ、未完了より後ろに並ぶ
- 20 件で打ち切られる

UI / 起動:

- 既定の対象タスクが入った状態で開き、フォーカスが本文欄にある
- 既定が決まらないとき、フォーカスが対象タスク欄にある
- 検索で対象タスクを切り替えられる
- `Ctrl+Enter` で追加され、ウィンドウが hide される
- `Esc` でキャンセルされ、何も追加されない
- 空白のみの本文では確定できない
- 再表示時に前回の入力が残っていない
- `worklog:added` が emit される
- `--quick` と `--quick-log` の argv 判定が互いに干渉しない

## 完了条件

`pnpm test` / `cargo test` が緑。ホットキーからの追記が実機で動く。
