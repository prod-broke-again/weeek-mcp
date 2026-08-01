import type { Task, TaskTreeNode } from "../../domain/task/entities.js";
import { wrapUntrusted } from "./untrusted.js";

const PRIORITY: Record<number, string> = {
  0: "low",
  1: "medium",
  2: "high",
  3: "hold",
};

export interface TaskNameMaps {
  users?: Record<string, string>;
  tags?: Record<number, string>;
  projects?: Record<number, string>;
  boards?: Record<number, string>;
  columns?: Record<number, string>;
}

function userName(id: string, maps?: TaskNameMaps): string {
  return maps?.users?.[id] ?? id;
}

function formatLocations(task: Task, maps?: TaskNameMaps): string {
  if (task.locations.length === 0) return "—";
  return task.locations
    .map((loc) => {
      const p = maps?.projects?.[loc.projectId] ?? loc.projectId;
      const b =
        loc.boardId !== null ? (maps?.boards?.[loc.boardId] ?? loc.boardId) : "—";
      const c =
        loc.boardColumnId !== null
          ? (maps?.columns?.[loc.boardColumnId] ?? loc.boardColumnId)
          : "—";
      return `${p} / ${b} / ${c}`;
    })
    .join("; ");
}

export function presentTaskCompact(task: Task, maps?: TaskNameMaps): string {
  const status = task.isCompleted ? "done" : "open";
  const pri = task.priority === null ? "—" : PRIORITY[task.priority] ?? String(task.priority);
  const due = task.dueDate ?? task.dueDateTime ?? "—";
  const assignees =
    task.assignees.length > 0
      ? task.assignees.map((id) => userName(id, maps)).join(", ")
      : "—";
  const tags =
    task.tags.length > 0
      ? task.tags.map((id) => maps?.tags?.[id] ?? String(id)).join(", ")
      : "—";
  const att = task.attachments.length > 0 ? ` attachments=${task.attachments.length}` : "";
  return `- #${task.id} [${status}/${pri}] ${task.title} | due ${due} | ${assignees} | tags: ${tags}${att}`;
}

export function presentTaskList(tasks: Task[], maps?: TaskNameMaps, hasMore = false): string {
  if (tasks.length === 0) return "No tasks matched.";
  const lines = tasks.map((t) => presentTaskCompact(t, maps));
  if (hasMore) lines.push("_…hasMore: true — increase offset to continue_");
  return lines.join("\n");
}

export function presentTaskDetail(task: Task, maps?: TaskNameMaps): string {
  const lines: string[] = [
    `# Task #${task.id}: ${task.title}`,
    "",
    `- Status: ${task.isCompleted ? "completed" : "open"}${task.isDeleted ? " (deleted)" : ""}`,
    `- Type: ${task.type} | Priority: ${task.priority === null ? "—" : PRIORITY[task.priority] ?? task.priority}`,
    `- Author: ${userName(task.authorId, maps)}`,
    `- Assignees: ${task.assignees.map((id) => userName(id, maps)).join(", ") || "—"}`,
    `- Watchers: ${task.subscribers.map((id) => userName(id, maps)).join(", ") || "—"}`,
    `- Tags: ${task.tags.map((id) => maps?.tags?.[id] ?? id).join(", ") || "—"}`,
    `- Location: ${formatLocations(task, maps)}`,
    `- Start: ${task.startDate ?? task.startDateTime ?? "—"}`,
    `- Due: ${task.dueDate ?? task.dueDateTime ?? "—"}`,
    `- Created: ${task.createdAt || "—"} | Updated: ${task.updatedAt || "—"}`,
    `- Subtasks: ${task.subTaskIds.length ? task.subTaskIds.map((id) => `#${id}`).join(", ") : "—"}`,
  ];

  if (task.description) {
    lines.push("", "## Description", wrapUntrusted(`task-${task.id}-description`, task.description));
  }

  if (task.attachments.length > 0) {
    lines.push("", "## Attachments");
    for (const a of task.attachments) {
      const size = a.size !== undefined ? `, ${a.size} bytes` : "";
      const svc = a.service ? `, ${a.service}` : "";
      lines.push(`- \`${a.id}\` ${a.name ?? "(unnamed)"}${size}${svc}`);
    }
    lines.push("", "_Use weeek_read_attachment with attachmentId to view content._");
  }

  if (task.timeEntries.length > 0) {
    lines.push("", `## Time entries (${task.timeEntries.length})`);
    for (const te of task.timeEntries.slice(0, 20)) {
      lines.push(
        `- ${te.date}: ${te.duration}m by ${userName(te.userId, maps)}${te.isOvertime ? " (OT)" : ""}`,
      );
    }
  }

  return lines.join("\n");
}

export function presentTaskTree(node: TaskTreeNode, maps?: TaskNameMaps, indent = 0): string {
  const pad = "  ".repeat(indent);
  const line = `${pad}${presentTaskCompact(node.task, maps).replace(/^- /, "")}`;
  const childLines = node.children.map((c) => presentTaskTree(c, maps, indent + 1));
  return [line, ...childLines].join("\n");
}

export function taskToStructured(task: Task, maps?: TaskNameMaps): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    isCompleted: task.isCompleted,
    type: task.type,
    priority: task.priority,
    dueDate: task.dueDate,
    dueDateTime: task.dueDateTime,
    assignees: task.assignees.map((id) => ({ id, name: userName(id, maps) })),
    tags: task.tags.map((id) => ({ id, name: maps?.tags?.[id] ?? String(id) })),
    locations: task.locations,
    subTaskIds: task.subTaskIds,
    attachments: task.attachments,
    description: task.description,
  };
}
