import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Priority } from "@/lib/priority";
import { TaskCard } from "./TaskCard";
const baseTask = (over = {}) => ({
    id: "T",
    projectId: "P",
    columnId: "C",
    title: "サンプルタスク",
    memo: null,
    dueDate: null,
    priority: Priority.None,
    position: 0,
    completedAt: null,
    createdAt: "",
    updatedAt: "",
    ...over,
});
describe("TaskCard", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 4, 12, 12, 0, 0));
    });
    afterEach(() => vi.useRealTimers());
    it("タイトルが表示される", () => {
        render(_jsx(TaskCard, { task: baseTask({ title: "実装する" }) }));
        expect(screen.getByText("実装する")).toBeInTheDocument();
    });
    it("優先度がNoneなら優先度ラベルは表示しない", () => {
        render(_jsx(TaskCard, { task: baseTask({ priority: Priority.None }) }));
        expect(screen.queryByText("なし")).not.toBeInTheDocument();
    });
    it("優先度がHighなら'高'バッジを表示する", () => {
        render(_jsx(TaskCard, { task: baseTask({ priority: Priority.High }) }));
        expect(screen.getByText("高")).toBeInTheDocument();
    });
    it("期日があれば YYYY/MM/DD で表示", () => {
        render(_jsx(TaskCard, { task: baseTask({ dueDate: "2026-05-15" }) }));
        expect(screen.getByText("2026/05/15")).toBeInTheDocument();
    });
    it("期日が過ぎていればoverdueラベルがつく", () => {
        render(_jsx(TaskCard, { task: baseTask({ dueDate: "2026-01-01" }) }));
        const el = screen.getByText("2026/01/01");
        expect(el).toHaveAttribute("data-overdue", "true");
    });
});
