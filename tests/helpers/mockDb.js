import { vi } from "vitest";
export function createMockDb() {
    return {
        select: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
    };
}
