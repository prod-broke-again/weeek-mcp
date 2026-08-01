import type {
  AttachmentId,
  BoardColumnId,
  BoardId,
  Paginated,
  Priority,
  ProjectId,
  TagId,
  TaskId,
  TaskType,
  UserId,
} from "../shared/types.js";

export interface TaskLocation {
  projectId: ProjectId;
  boardId: BoardId | null;
  boardColumnId: BoardColumnId | null;
}

export interface TimeEntry {
  id: string;
  userId: UserId;
  type: number;
  isOvertime: boolean;
  date: string;
  duration: number;
}

export interface CustomFieldValue {
  id: string;
  value: unknown;
}

export interface TaskAttachmentRef {
  id: AttachmentId;
  name?: string;
  size?: number;
  service?: string;
}

export interface Task {
  id: TaskId;
  parentId: TaskId | null;
  title: string;
  description: string | null;
  type: TaskType;
  priority: Priority;
  isCompleted: boolean;
  isDeleted: boolean;
  isPrivate: boolean;
  authorId: UserId;
  assignees: UserId[];
  subscribers: UserId[];
  tags: TagId[];
  subTaskIds: TaskId[];
  locations: TaskLocation[];
  startDate: string | null;
  dueDate: string | null;
  startDateTime: string | null;
  dueDateTime: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  durationMinutes: number | null;
  overdue: number;
  attachments: TaskAttachmentRef[];
  timeEntries: TimeEntry[];
  customFields: CustomFieldValue[];
}

export interface TaskFilter {
  projectId?: ProjectId;
  boardId?: BoardId;
  boardColumnId?: BoardColumnId;
  userId?: UserId;
  completed?: boolean;
  type?: TaskType;
  priority?: Exclude<Priority, null>;
  tags?: TagId[];
  search?: string;
  day?: string;
  startDate?: string;
  endDate?: string;
  completedAtFrom?: string;
  completedAtTo?: string;
  all?: boolean;
  sortBy?: string;
  perPage?: number;
  offset?: number;
}

export type TaskPage = Paginated<Task>;

export interface TaskTreeNode {
  task: Task;
  children: TaskTreeNode[];
}
