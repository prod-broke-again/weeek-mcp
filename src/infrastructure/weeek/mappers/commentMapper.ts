import type { TaskComment, TaskCommentsResult } from "../../../domain/task/Comment.js";
import { proseMirrorToText } from "./proseMirror.js";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function mapTaskComment(dto: unknown): TaskComment {
  const r = asRecord(dto);
  const user = asRecord(r.user);
  const contentRoot = asRecord(r.content);
  const { text, images } = proseMirrorToText(contentRoot.data ?? contentRoot);

  const authorName =
    (typeof user.name === "string" && user.name.trim()) ||
    [user.first_name, user.last_name].filter((x) => typeof x === "string" && x).join(" ").trim() ||
    String(r.userId ?? "unknown");

  return {
    id: Number(r.id),
    parentId: r.parentId === null || r.parentId === undefined ? null : Number(r.parentId),
    authorId: String(r.userId ?? user.id ?? ""),
    authorName,
    authorEmail: typeof user.email === "string" ? user.email : null,
    sentAt: String(r.sentAt ?? ""),
    text,
    images,
    isUpdated: Boolean(r.isUpdated),
  };
}

export function mapTaskCommentsResponse(taskId: number, envelope: unknown): TaskCommentsResult {
  const root = asRecord(envelope);
  const task = asRecord(root.task);
  const rawComments = Array.isArray(task.comments) ? task.comments : [];
  const comments = rawComments.map(mapTaskComment);
  const commentsCount =
    typeof task.commentsCount === "number" ? task.commentsCount : comments.length;

  return { taskId, commentsCount, comments };
}
