import type { Priority } from "@/lib/priority";

export interface Project {
  id: string;
  name: string;
  position: number;
  doneColumnId: string | null;
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
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLog {
  id: string;
  taskId: string;
  projectId: string;
  body: string;
  taskTitle: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
}
