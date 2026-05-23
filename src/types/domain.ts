import type { Priority } from "@/lib/priority";

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  position: number;
}

export interface Task {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  memo: string | null;
  dueDate: string | null;
  priority: Priority;
  position: number;
  createdAt: string;
  updatedAt: string;
}
