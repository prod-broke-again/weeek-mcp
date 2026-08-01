export type UserId = string;
export type AttachmentId = string;
export type TaskId = number;
export type ProjectId = number;
export type BoardId = number;
export type BoardColumnId = number;
export type TagId = number;

export type Priority = 0 | 1 | 2 | 3 | null;
export type TaskType = "action" | "meet" | "call";

export interface Paginated<T> {
  items: T[];
  hasMore: boolean;
  offset: number;
  perPage: number;
}
