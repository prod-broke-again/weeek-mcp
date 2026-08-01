import type { TaskFilter } from "../../../domain/task/entities.js";
import { toWeeekFilterDate } from "../mappers/primitives.js";

export const tasksList = {
  path: "/tm/tasks",
  envelopeKey: "tasks" as const,
};

export const taskById = (id: number) => ({
  path: `/tm/tasks/${id}`,
  envelopeKey: "task" as const,
});

export function serializeTaskFilter(filter: TaskFilter): Record<
  string,
  string | number | boolean | Array<string | number> | undefined
> {
  const q: Record<string, string | number | boolean | Array<string | number> | undefined> = {
    projectId: filter.projectId,
    boardId: filter.boardId,
    boardColumnId: filter.boardColumnId,
    userId: filter.userId,
    type: filter.type,
    priority: filter.priority ?? undefined,
    search: filter.search,
    day: filter.day,
    sortBy: filter.sortBy,
    perPage: filter.perPage,
    offset: filter.offset,
    all: filter.all,
  };

  if (filter.completed !== undefined) q.completed = filter.completed;
  if (filter.tags?.length) q.tags = filter.tags;
  if (filter.startDate) q.startDate = toWeeekFilterDate(filter.startDate);
  if (filter.endDate) q.endDate = toWeeekFilterDate(filter.endDate);
  if (filter.completedAtFrom) q.completedAtFrom = filter.completedAtFrom;
  if (filter.completedAtTo) q.completedAtTo = filter.completedAtTo;

  return q;
}
