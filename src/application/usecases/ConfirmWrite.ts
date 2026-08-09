import { DomainError } from "../../domain/shared/errors.js";
import type { DirectoryRepository } from "../../domain/ports/DirectoryRepository.js";
import type { TaskRepository } from "../../domain/ports/TaskRepository.js";
import type { Task } from "../../domain/task/entities.js";
import type { PendingWriteStore } from "../../infrastructure/write/PendingWriteStore.js";

export class ConfirmWrite {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly directory: DirectoryRepository,
    private readonly pending: PendingWriteStore,
  ) {}

  async execute(input: { confirmationToken: string }) {
    const stored = this.pending.consume(input.confirmationToken);
    const { intent } = stored;

    switch (intent.kind) {
      case "create_task": {
        const created = await this.tasks.create(intent.payload.create);
        let task = created;
        if (intent.payload.postCreateUpdate) {
          try {
            task = await this.tasks.update(created.id, intent.payload.postCreateUpdate);
          } catch (error) {
            throw new DomainError(
              "UPSTREAM",
              `Task #${created.id} was created, but its dates/tags could not be applied. Review the task before retrying.`,
              { cause: error, details: { taskId: created.id, partialWrite: true } },
            );
          }
        }
        return this.taskResult("created", task);
      }
      case "update_task": {
        const task = await this.tasks.update(
          intent.payload.taskId,
          intent.payload.changes,
        );
        return this.taskResult("updated", task);
      }
      case "move_task": {
        const { taskId, projectId, boardId, boardColumnId } = intent.payload;
        if (projectId !== undefined) {
          await this.tasks.addLocation(taskId, {
            projectId,
            ...(boardColumnId !== undefined ? { boardColumnId } : {}),
          });
        }
        if (boardId !== undefined) await this.tasks.setBoard(taskId, boardId);
        if (boardColumnId !== undefined && projectId === undefined) {
          await this.tasks.setBoardColumn(taskId, boardColumnId);
        }
        const task = await this.tasks.byId(taskId);
        return this.taskResult("moved", task);
      }
      case "delete_task": {
        await this.tasks.delete(intent.payload.taskId);
        return {
          markdown: `Weeek task #${intent.payload.taskId} deleted.`,
          structured: {
            operation: "delete_task",
            taskId: intent.payload.taskId,
            status: "deleted",
          },
        };
      }
    }
  }

  private async taskResult(action: string, task: Task) {
    const workspace = await this.directory.workspace();
    const location = task.locations.find((item) => item.boardId !== null);
    const url =
      location?.boardId !== null && location?.boardId !== undefined
        ? `https://app.weeek.net/ws/${workspace.id}/project/${location.projectId}/board/${location.boardId}?modals=m_task&m_task_workspace-id=${workspace.id}&m_task_id=${task.id}`
        : undefined;
    return {
      markdown: [
        `Weeek task #${task.id} ${action}: ${task.title}`,
        ...(url ? [`${url}`] : []),
      ].join("\n"),
      structured: {
        operation: `${action}_task`,
        taskId: task.id,
        status: action,
        ...(url ? { url } : {}),
      },
    };
  }
}
