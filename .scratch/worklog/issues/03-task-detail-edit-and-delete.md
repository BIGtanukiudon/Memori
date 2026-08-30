# 03. タスク詳細モーダル: 作業ログの編集と削除

Status: ready-for-agent
依存: 02

## 目的

誤字や後からの補足に対応する。02 と分けているのは、追加・閲覧だけで先に
運用を始められるようにするため。

## 変更対象

- `src/components/TaskDetailDialog.tsx`
- `src/components/TaskDetailDialog.test.tsx`
- `src/data/workLogActions.ts` / `src/data/useWorkLogs.ts`

## 仕様

- 各ログ行に編集・削除のボタン
- 編集はインライン。行が `textarea` に変わり、保存／キャンセル
- 保存時に本文が空白のみなら保存不可
- 削除は既存の `ConfirmDialog` を再利用して確認する
- **タスク詳細の削除確認ダイアログと競合しないこと。** 現状 `TaskDetailDialog` は
  `confirmDelete` 単一フラグでタスク削除確認を出し、`open && !confirmDelete` で
  本体を隠している。作業ログの削除確認を同じフラグに相乗りさせると
  タスクごと消える事故につながるため、状態を分けること

## テスト観点（TDD）

- 編集ボタンで入力欄になり、既存本文が入っている
- 保存で `onUpdate` が呼ばれ、表示が更新される
- キャンセルで元の本文に戻る
- 空白のみでは保存できない
- 削除は確認を挟み、確定で `onDelete` が呼ばれる
- 作業ログの削除確認を出してもタスク削除の確認とは独立している

## 完了条件

`pnpm test` が緑。
