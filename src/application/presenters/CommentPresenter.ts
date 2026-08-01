import type { TaskComment, TaskCommentsResult } from "../../domain/task/Comment.js";
import { wrapUntrusted } from "./untrusted.js";

export function presentComments(result: TaskCommentsResult): string {
  if (result.comments.length === 0) {
    return `No comments on task #${result.taskId} (commentsCount=${result.commentsCount}).`;
  }

  const blocks = result.comments.map((c) => presentOneComment(c));
  return [
    `# Comments on task #${result.taskId} (${result.comments.length}/${result.commentsCount})`,
    "",
    ...blocks,
  ].join("\n");
}

export function presentOneComment(c: TaskComment): string {
  const when = c.sentAt || "—";
  const lines = [
    `### #${c.id} — ${c.authorName}${c.authorEmail ? ` <${c.authorEmail}>` : ""} · ${when}`,
  ];
  if (c.images.length > 0) {
    for (const img of c.images) {
      lines.push(`- image: ${img.name} \`${img.id}\` ${img.url}`);
    }
  }
  if (c.text) {
    lines.push(wrapUntrusted(`comment-${c.id}`, c.text));
  }
  lines.push("");
  return lines.join("\n");
}

export function commentsToStructured(result: TaskCommentsResult): Record<string, unknown> {
  return {
    taskId: result.taskId,
    commentsCount: result.commentsCount,
    comments: result.comments.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      authorId: c.authorId,
      authorName: c.authorName,
      authorEmail: c.authorEmail,
      sentAt: c.sentAt,
      text: c.text,
      images: c.images,
      isUpdated: c.isUpdated,
    })),
  };
}
