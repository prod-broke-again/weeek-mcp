import { DomainError } from "../../domain/shared/errors.js";
import type { TaskRepository } from "../../domain/ports/TaskRepository.js";
import type { PendingWriteStore } from "../../infrastructure/write/PendingWriteStore.js";
import type { UpdateTaskInput } from "../../domain/task/write.js";
import type { Config } from "../../infrastructure/config/Config.js";
import { assertDateModes, assertTaskAllowed, formatValue } from "./writeHelpers.js";

export interface ProposeUpdateTaskInput extends UpdateTaskInput {
  taskId: number;
}

export class ProposeUpdateTask {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly config: Config,
    private readonly pending: PendingWriteStore,
  ) {}

  async execute(input: ProposeUpdateTaskInput) {
    assertDateModes(input);
    const { taskId, ...changes } = input;
    if (Object.keys(changes).length === 0) {
      throw new DomainError("VALIDATION", "At least one task field must be provided.");
    }
    const task = await this.tasks.byId(taskId);
    assertTaskAllowed(this.config, task);
    const changeLines = Object.entries(changes).map(
      ([key, value]) => `- ${key}: ${formatValue(value)}`,
    );
    const preview = [
      `# Pending update for Weeek task #${task.id}`,
      `- Current title: ${task.title}`,
      "",
      "## Changes",
      ...changeLines,
      "",
      "**No change has been made. Show this preview to the user and wait for an explicit confirmation.**",
    ].join("\n");

    const { confirmationToken, expiresAt } = this.pending.create({
      kind: "update_task",
      payload: { taskId, changes },
      preview,
    });
    return {
      markdown: `${preview}\n\nConfirmation token: \`${confirmationToken}\`\nExpires: ${expiresAt}`,
      structured: {
        operation: "update_task",
        taskId,
        preview,
        confirmationToken,
        expiresAt,
      },
    };
  }
}
