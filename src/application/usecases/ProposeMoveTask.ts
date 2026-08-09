import { DomainError } from "../../domain/shared/errors.js";
import type { TaskRepository } from "../../domain/ports/TaskRepository.js";
import type { ProjectRepository } from "../../domain/ports/ProjectRepository.js";
import type { Config } from "../../infrastructure/config/Config.js";
import type { PendingWriteStore } from "../../infrastructure/write/PendingWriteStore.js";
import { assertProjectWritable, resolveProjectId } from "../../infrastructure/config/Config.js";
import { assertTaskWritable, describeColumn } from "./writeHelpers.js";

export interface ProposeMoveTaskInput {
  taskId: number;
  project?: number | string;
  boardId?: number;
  boardColumnId?: number;
}

export class ProposeMoveTask {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly projects: ProjectRepository,
    private readonly config: Config,
    private readonly pending: PendingWriteStore,
  ) {}

  async execute(input: ProposeMoveTaskInput) {
    if (
      input.project === undefined &&
      input.boardId === undefined &&
      input.boardColumnId === undefined
    ) {
      throw new DomainError("VALIDATION", "Provide project, boardId, or boardColumnId.");
    }
    const task = await this.tasks.byId(input.taskId);
    assertTaskWritable(this.config, task);
    const projectId =
      resolveProjectId(this.config, input.project) ?? task.locations[0]?.projectId;
    if (projectId === undefined) {
      throw new DomainError("VALIDATION", "Cannot infer target project; pass project explicitly.");
    }
    assertProjectWritable(this.config, projectId);
    const names = await describeColumn(this.projects, projectId, input.boardColumnId);
    if (input.boardId !== undefined) {
      const board = (await this.projects.boards(projectId)).find((item) => item.id === input.boardId);
      if (!board) {
        throw new DomainError(
          "VALIDATION",
          `Board ${input.boardId} does not belong to project ${projectId}.`,
        );
      }
      if (names.boardName && names.boardName !== board.name) {
        throw new DomainError(
          "VALIDATION",
          `Column ${input.boardColumnId} does not belong to board ${input.boardId}.`,
        );
      }
    }

    const target = [
      `${names.projectName} (#${projectId})`,
      input.boardId !== undefined ? `${names.boardName ?? "board"} (#${input.boardId})` : names.boardName,
      input.boardColumnId !== undefined
        ? `${names.columnName ?? "column"} (#${input.boardColumnId})`
        : undefined,
    ]
      .filter(Boolean)
      .join(" / ");
    const preview = [
      `# Pending move for Weeek task #${task.id}`,
      `- Task: ${task.title}`,
      `- Target: ${target}`,
      "",
      "**No change has been made. Show this preview to the user and wait for an explicit confirmation.**",
    ].join("\n");
    const { confirmationToken, expiresAt } = this.pending.create({
      kind: "move_task",
      payload: {
        taskId: task.id,
        ...(input.project !== undefined ? { projectId } : {}),
        ...(input.boardId !== undefined ? { boardId: input.boardId } : {}),
        ...(input.boardColumnId !== undefined
          ? { boardColumnId: input.boardColumnId }
          : {}),
      },
      preview,
    });
    return {
      markdown: `${preview}\n\nConfirmation token: \`${confirmationToken}\`\nExpires: ${expiresAt}`,
      structured: {
        operation: "move_task",
        taskId: task.id,
        preview,
        confirmationToken,
        expiresAt,
      },
    };
  }
}
