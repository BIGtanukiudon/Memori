# 01. マイグレーションと DB 層

Status: ready-for-agent
依存: なし
PRD: `.scratch/worklog/PRD.md` §4

## 目的

作業ログの永続化層を用意する。UI・CLI の全機能がここに乗るため最初に固める。

## 変更対象

- `src-tauri/migrations/004_work_logs.sql`（新規）
- `src/types/domain.ts`
- `src/db/mappers.ts`
- `src/db/workLogs.ts`（新規）
- `src/db/workLogs.test.ts`（新規）

## 仕様

### マイグレーション

```sql
CREATE TABLE IF NOT EXISTS work_logs (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL,
  project_id   TEXT NOT NULL,
  body         TEXT NOT NULL,
  task_title   TEXT NOT NULL,
  project_name TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_logs_created ON work_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_work_logs_task    ON work_logs(task_id, created_at);
```

**`task_id` / `project_id` に外部キーを張らないこと。** 既存テーブルは全て
`ON DELETE CASCADE` だが、作業ログはタスク削除後も残す（PRD §4）。
レビュー時に「制約の付け忘れ」と誤解されやすいので、SQL にコメントを残す。

Tauri 側のマイグレーション登録（`src-tauri/src/lib.rs`）も忘れないこと。

### 型

```ts
export interface WorkLog {
  id: string;
  taskId: string;
  projectId: string;
  body: string;
  taskTitle: string;      // 記録時点のスナップショット
  projectName: string;    // 記録時点のスナップショット
  createdAt: string;
  updatedAt: string;
}
```

### 関数

| 関数 | 挙動 |
|---|---|
| `createWorkLog(db, { taskId, body })` | **呼び出し側にスナップショットを渡させない。** 関数内で `tasks`／`projects` を引いて `project_id` / `task_title` / `project_name` を埋める。タスクが存在しなければ throw |
| `listWorkLogsByTask(db, taskId)` | `created_at DESC`（新しい順） |
| `updateWorkLog(db, id, body)` | `body` と `updated_at` のみ更新 |
| `deleteWorkLog(db, id)` | 物理削除 |

- ID は既存同様 `newId()`（ULID）
- 日時は `new Date().toISOString()`（UTC）。既存 `src/db/tasks.ts` の `nowIso()` に倣う
- `body` が空白のみなら `throw new Error("本文は必須です")`（既存の「タイトルは必須です」に合わせる）

### 期間検索はここに含めない

`listWorkLogsBetween` 系は TS 側では当面呼ばれない（CLI は Rust 側で自前 SQL を書く）。
デッドコードになるため、アプリ内タイムラインビュー（issue 08）で追加する。

## テスト観点（TDD・`tests/helpers/mockDb.ts` を使用）

- 作成した作業ログが取得できる
- `task_title` / `project_name` / `project_id` がタスク・プロジェクトから解決されて入る
- 存在しない `taskId` で作成するとエラー
- 空文字・空白のみの `body` でエラー
- 一覧が新しい順に並ぶ
- 更新で `body` と `updated_at` が変わり `created_at` は変わらない
- 削除後は一覧に出ない

## 完了条件

`pnpm test` が緑。マイグレーションが起動時に適用される。
