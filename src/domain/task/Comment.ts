import type { UserId } from "../shared/types.js";

export interface CommentImage {
  id: string;
  name: string;
  url: string;
  size: number | null;
}

export interface TaskComment {
  id: number;
  parentId: number | null;
  authorId: UserId;
  authorName: string;
  authorEmail: string | null;
  sentAt: string;
  text: string;
  images: CommentImage[];
  isUpdated: boolean;
}

export interface TaskCommentsResult {
  taskId: number;
  commentsCount: number;
  comments: TaskComment[];
}
