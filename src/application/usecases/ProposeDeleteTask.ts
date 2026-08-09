import type { TaskRepository } from "../../domain/ports/TaskRepository.js";
import type { PendingWriteStore } from "../../infrastructure/write/PendingWriteStore.js";
import type { Config } from "../../infrastructure/config/Config.js";
import { assertTaskAllowed } from "./writeHelpers.js";

export class ProposeDeleteTask {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly config: Config,
    private readonly pending: PendingWriteStore,
  ) {}

  async execute(input: { taskId: number }) {
    const task = await this.tasks.byId(input.taskId);
    assertTaskAllowed(this.config, task);
    const preview = [
      `# Pending deletion of Weeek task #${task.id}`,
      `- Title: ${task.title}`,
      `- Status: ${task.isCompleted ? "completed" : "open"}`,
      `- Description: ${task.description ?? "—"}`,
      "",
      "**This is destructive. No change has been made. Show this preview to the user and wait for an explicit confirmation.**",
    ].join("\n");
    const { confirmationToken, expiresAt } = this.pending.create({
      kind: "delete_task",
      payload: { taskId: task.id },
      preview,
    });
    return {
      markdown: `${preview}\n\nConfirmation token: \`${confirmationToken}\`\nExpires: ${expiresAt}`,
      structured: {
        operation: "delete_task",
        taskId: task.id,
        preview,
        confirmationToken,
        expiresAt,
      },
    };
  }
}
