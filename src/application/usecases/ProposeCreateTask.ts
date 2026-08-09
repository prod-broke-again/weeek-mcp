import type { Config } from "../../infrastructure/config/Config.js";
import type { ProjectRepository } from "../../domain/ports/ProjectRepository.js";
import type { PendingWriteStore } from "../../infrastructure/write/PendingWriteStore.js";
import type { Priority, TagId, TaskId, TaskType, UserId } from "../../domain/shared/types.js";
import type { UpdateTaskInput } from "../../domain/task/write.js";
import { assertDateModes, describeColumn, requireProjectId } from "./writeHelpers.js";

export interface ProposeCreateTaskInput {
  title: string;
  description?: string | null;
  project?: number | string;
  boardColumnId?: number;
  day?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  startDateTime?: string | null;
  dueDateTime?: string | null;
  priority?: Priority;
  type?: TaskType;
  assigneeUserId?: UserId | null;
  parentId?: TaskId | null;
  tags?: TagId[];
  customFields?: Record<string, unknown>;
}

export class ProposeCreateTask {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly config: Config,
    private readonly pending: PendingWriteStore,
  ) {}

  async execute(input: ProposeCreateTaskInput) {
    assertDateModes(input);
    const projectId = requireProjectId(this.config, input.project);
    const names = await describeColumn(this.projects, projectId, input.boardColumnId);
    const postCreateUpdate: UpdateTaskInput = {};
    for (const key of [
      "startDate",
      "dueDate",
      "startDateTime",
      "dueDateTime",
      "tags",
    ] as const) {
      const value = input[key];
      if (value !== undefined) postCreateUpdate[key] = value as never;
    }

    const create = {
      title: input.title,
      description: input.description,
      day: input.day,
      parentId: input.parentId,
      userId: input.assigneeUserId,
      locations: [{ projectId, boardColumnId: input.boardColumnId ?? null }],
      type: input.type,
      priority: input.priority,
      customFields: input.customFields,
    };
    const location = [names.projectName, names.boardName, names.columnName]
      .filter(Boolean)
      .join(" / ");
    const preview = [
      "# Pending Weeek task creation",
      `- Title: ${input.title}`,
      `- Location: ${location}`,
      `- Description: ${input.description ?? "—"}`,
      `- Date: ${input.day ?? input.startDate ?? input.startDateTime ?? "—"} → ${input.dueDate ?? input.dueDateTime ?? "—"}`,
      `- Priority/type: ${input.priority ?? "—"} / ${input.type ?? "action"}`,
      `- Assignee: ${input.assigneeUserId ?? "—"}`,
      "",
      "**No change has been made. Show this preview to the user and wait for an explicit confirmation.**",
    ].join("\n");

    const { confirmationToken, expiresAt } = this.pending.create({
      kind: "create_task",
      payload: {
        create,
        ...(Object.keys(postCreateUpdate).length > 0 ? { postCreateUpdate } : {}),
      },
      preview,
    });
    return {
      markdown: `${preview}\n\nConfirmation token: \`${confirmationToken}\`\nExpires: ${expiresAt}`,
      structured: {
        operation: "create_task",
        preview,
        confirmationToken,
        expiresAt,
      },
    };
  }
}
