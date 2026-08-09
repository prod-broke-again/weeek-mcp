import { DomainError } from "../../domain/shared/errors.js";
import type { Config } from "../../infrastructure/config/Config.js";
import {
  assertProjectAllowed,
  assertProjectWritable,
  resolveProjectId,
} from "../../infrastructure/config/Config.js";
import type { ProjectRepository } from "../../domain/ports/ProjectRepository.js";
import type { Task } from "../../domain/task/entities.js";

export function requireProjectId(config: Config, input?: number | string): number {
  const projectId = resolveProjectId(config, input);
  if (projectId === undefined) {
    throw new DomainError(
      "VALIDATION",
      "Project is required. Pass projectId/project alias or configure WEEEK_DEFAULT_PROJECT_ID.",
    );
  }
  assertProjectWritable(config, projectId);
  return projectId;
}

export function assertDateModes(input: {
  day?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  startDateTime?: string | null;
  dueDateTime?: string | null;
}): void {
  const hasDay = Boolean(input.day);
  const hasDate = Boolean(input.startDate || input.dueDate);
  const hasDateTime = Boolean(input.startDateTime || input.dueDateTime);
  if (hasDay && (hasDate || hasDateTime)) {
    throw new DomainError("VALIDATION", "Use day or a start/due range, not both.");
  }
  if (hasDate && hasDateTime) {
    throw new DomainError(
      "VALIDATION",
      "Date-only fields cannot be combined with datetime fields.",
    );
  }
}

/** Task must be readable (all locations) — used when inspecting cards. */
export function assertTaskReadable(config: Config, task: Task): void {
  if (config.readOnlyProjects.length === 0) return;
  if (task.locations.length === 0) {
    throw new DomainError(
      "FORBIDDEN",
      `Task ${task.id} has no project location, so it cannot be checked against WEEEK_READ_ONLY_PROJECTS.`,
    );
  }
  for (const location of task.locations) {
    assertProjectAllowed(config, location.projectId);
  }
}

/** Task must be writable in every location — used by propose_* mutations. */
export function assertTaskWritable(config: Config, task: Task): void {
  if (task.locations.length === 0) {
    throw new DomainError(
      "FORBIDDEN",
      `Task ${task.id} has no project location, so it cannot be checked against WEEEK_WRITE_PROJECTS.`,
    );
  }
  for (const location of task.locations) {
    assertProjectWritable(config, location.projectId);
  }
}

/** @deprecated Use assertTaskWritable for mutations. */
export function assertTaskAllowed(config: Config, task: Task): void {
  assertTaskWritable(config, task);
}

export async function describeColumn(
  projects: ProjectRepository,
  projectId: number,
  boardColumnId?: number,
): Promise<{ projectName: string; boardName?: string; columnName?: string }> {
  const project = await projects.byId(projectId);
  if (boardColumnId === undefined) return { projectName: project.name };

  const boards = await projects.boards(projectId);
  for (const board of boards) {
    const columns = await projects.columns(board.id, projectId);
    const column = columns.find((item) => item.id === boardColumnId);
    if (column) {
      return {
        projectName: project.name,
        boardName: board.name,
        columnName: column.name,
      };
    }
  }
  throw new DomainError(
    "VALIDATION",
    `Column ${boardColumnId} does not belong to project ${projectId}. Use weeek_get_board and never guess ids.`,
  );
}

export function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
