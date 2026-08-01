import type { Task, TaskAttachmentRef, TaskLocation, TimeEntry } from "../../../domain/task/entities.js";
import type { Priority, TaskType } from "../../../domain/shared/types.js";
import { normalizeDateString, toBool, toNumberOrNull } from "./primitives.js";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function mapLocations(dto: Record<string, unknown>): TaskLocation[] {
  const locations = dto.locations;
  if (Array.isArray(locations) && locations.length > 0) {
    return locations.map((loc) => {
      const r = asRecord(loc);
      return {
        projectId: Number(r.projectId),
        boardId: toNumberOrNull(r.boardId),
        boardColumnId: toNumberOrNull(r.boardColumnId),
      };
    });
  }

  // Legacy single-location fields (deprecated after multi-project changelog).
  const projectId = toNumberOrNull(dto.projectId);
  if (projectId === null) return [];
  return [
    {
      projectId,
      boardId: toNumberOrNull(dto.boardId),
      boardColumnId: toNumberOrNull(dto.boardColumnId),
    },
  ];
}

function mapAttachments(raw: unknown): TaskAttachmentRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return { id: item };
    const r = asRecord(item);
    return {
      id: String(r.id ?? r.fileId ?? r.file_id ?? ""),
      name: typeof r.name === "string" ? r.name : undefined,
      size: typeof r.size === "number" ? r.size : undefined,
      service: typeof r.service === "string" ? r.service : undefined,
    };
  }).filter((a) => a.id);
}

function mapTimeEntries(raw: unknown): TimeEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const r = asRecord(item);
    return {
      id: String(r.id ?? ""),
      userId: String(r.userId ?? ""),
      type: Number(r.type ?? 0),
      isOvertime: toBool(r.isOvertime),
      date: normalizeDateString(r.date) ?? String(r.date ?? ""),
      duration: Number(r.duration ?? 0),
    };
  });
}

function mapPriority(value: unknown): Priority {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (n === 0 || n === 1 || n === 2 || n === 3) return n;
  return null;
}

function mapType(value: unknown): TaskType {
  if (value === "meet" || value === "call" || value === "action") return value;
  return "action";
}

export function mapTask(dto: unknown): Task {
  const r = asRecord(dto);
  const assignees = Array.isArray(r.assignees)
    ? r.assignees.map(String)
    : r.userId
      ? [String(r.userId)]
      : [];

  return {
    id: Number(r.id),
    parentId: toNumberOrNull(r.parentId),
    title: String(r.title ?? ""),
    description: r.description === null || r.description === undefined ? null : String(r.description),
    type: mapType(r.type),
    priority: mapPriority(r.priority),
    isCompleted: toBool(r.isCompleted),
    isDeleted: toBool(r.isDeleted),
    isPrivate: toBool(r.isPrivate),
    authorId: String(r.authorId ?? ""),
    assignees,
    subscribers: Array.isArray(r.subscribers) ? r.subscribers.map(String) : [],
    tags: Array.isArray(r.tags) ? r.tags.map(Number) : [],
    subTaskIds: Array.isArray(r.subTasks) ? r.subTasks.map(Number) : [],
    locations: mapLocations(r),
    startDate: normalizeDateString(r.startDate ?? r.dateStart),
    dueDate: normalizeDateString(r.dueDate ?? r.date ?? r.dateEnd),
    startDateTime: r.startDateTime ? String(r.startDateTime) : null,
    dueDateTime: r.dueDateTime ? String(r.dueDateTime) : null,
    createdAt: String(r.createdAt ?? ""),
    updatedAt: String(r.updatedAt ?? ""),
    completedAt: r.completedAt ? String(r.completedAt) : null,
    durationMinutes: toNumberOrNull(r.duration),
    overdue: Number(r.overdue ?? 0),
    attachments: mapAttachments(r.attachments),
    timeEntries: mapTimeEntries(r.timeEntries),
    customFields: Array.isArray(r.customFields)
      ? r.customFields.map((cf) => {
          const c = asRecord(cf);
          return { id: String(c.id ?? ""), value: c.value };
        })
      : [],
  };
}
