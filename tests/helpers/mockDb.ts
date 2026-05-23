import { vi } from "vitest";
import type { Db } from "@/db/types";

export interface MockDb extends Db {
  select: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
}

export function createMockDb(): MockDb {
  return {
    select: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
  };
}
