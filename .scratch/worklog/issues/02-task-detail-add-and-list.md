# 02. タスク詳細モーダル: 作業ログの追加と一覧

Status: ready-for-agent
依存: 01
PRD: `.scratch/worklog/PRD.md` §6-1

## 目的

作業ログを書く主導線を用意する。ここが動けば機能として最小限成立する。

## 変更対象

- `src/data/workLogActions.ts`（新規）
- `src/data/useWorkLogs.ts`（新規）
- `src/components/TaskDetailDialog.tsx`
- `src/components/TaskDetailDialog.test.tsx`
- `src/App.tsx` / `src/components/KanbanBoard.tsx`（配線）

## 仕様

### 状態の持ち方

作業ログは **Zustand ストアに載せない**。ボード全体で保持する必要がなく、
1タスクあたりの件数も少ないため、**ダイアログを開いたタイミングでロードする**。

`TaskDetailDialog` は **`App.tsx` と `KanbanBoard.tsx` の 2 か所**から使われている。
ロード処理を両方に書くと重複するため、`useWorkLogs(taskId)` フックに切り出し、
`workLogs` / `loading` / `addWorkLog` / `reload` を返す形にする。

### UI

- 既存フィールド（タイトル・メモ・期日・優先度）の**下**に「作業ログ」セクション
- 上部に入力欄（複数行 `textarea`）＋「追加」ボタン
- `Ctrl+Enter` で追加を確定する
- 本文が空白のみのときは追加ボタンを `disabled`
- 追加後は入力欄をクリアし、一覧の先頭に反映する
- 一覧は**新しい順**。各行に日時と本文
- 日時表示はローカル時刻。当日なら `HH:mm`、それ以外は `MM/DD HH:mm`
- 0件のときは「作業ログはまだありません」

### 注意

本文の改行は表示時も保持する（`whitespace-pre-wrap`）。

## テスト観点（TDD）

- 作業ログが新しい順に表示される
- 0件時に空メッセージが出る
- 空白のみの入力では追加ボタンが押せない
- 入力して追加すると `onAdd` が本文付きで呼ばれ、入力欄がクリアされる
- `Ctrl+Enter` で追加される
- 改行を含む本文がそのまま表示される
- タスクを切り替えるとそのタスクのログが読み直される

## 完了条件

`pnpm test` が緑。ボードのカードからも全タスク一覧からも作業ログを追加できる。
