import type {
  BoardColumnId,
  BoardId,
  Priority,
  ProjectId,
  TagId,
  TaskId,
  TaskType,
  UserId,
} from "../shared/types.js";

export interface CreateTaskLocation {
  projectId: ProjectId;
  boardColumnId: BoardColumnId | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  day?: string | null;
  parentId?: TaskId | null;
  userId?: UserId | null;
  locations: CreateTaskLocation[];
  type?: TaskType;
  priority?: Priority;
  customFields?: Record<string, unknown>;
}

export interface UpdateTaskInput {
  title?: string | null;
  description?: string | null;
  priority?: Priority;
  type?: TaskType | null;
  startDate?: string | null;
  dueDate?: string | null;
  startDateTime?: string | null;
  dueDateTime?: string | null;
  duration?: number | null;
  tags?: TagId[];
  customFields?: Record<string, unknown>;
}

export interface AddTaskLocationInput {
  projectId: ProjectId;
  boardColumnId?: BoardColumnId | null;
  after?: TaskId;
  before?: TaskId;
}

export type PendingWriteIntent =
  | {
      kind: "create_task";
      payload: {
        create: CreateTaskInput;
        postCreateUpdate?: UpdateTaskInput;
      };
      preview: string;
    }
  | {
      kind: "update_task";
      payload: { taskId: TaskId; changes: UpdateTaskInput };
      preview: string;
    }
  | {
      kind: "move_task";
      payload: {
        taskId: TaskId;
        projectId?: ProjectId;
        boardId?: BoardId;
        boardColumnId?: BoardColumnId;
      };
      preview: string;
    }
  | {
      kind: "delete_task";
      payload: { taskId: TaskId };
      preview: string;
    };

export interface StoredWriteIntent {
  intent: PendingWriteIntent;
  createdAt: string;
  expiresAt: string;
}
