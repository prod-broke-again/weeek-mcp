import type { TaskRepository } from "../../../domain/ports/TaskRepository.js";
import type { Task, TaskFilter, TaskPage, TaskTreeNode } from "../../../domain/task/entities.js";
import type { TaskId } from "../../../domain/shared/types.js";
import type { BoardColumnId, BoardId } from "../../../domain/shared/types.js";
import type {
  AddTaskLocationInput,
  CreateTaskInput,
  UpdateTaskInput,
} from "../../../domain/task/write.js";
import { DomainError } from "../../../domain/shared/errors.js";
import type { WeeekHttpClient } from "../WeeekHttpClient.js";
import { mapTask } from "../mappers/taskMapper.js";
import { serializeTaskFilter, taskById, tasksList } from "../endpoints/tasks.js";

export class WeeekTaskRepository implements TaskRepository {
  constructor(private readonly http: WeeekHttpClient) {}

  async find(filter: TaskFilter): Promise<TaskPage> {
    const perPage = filter.perPage ?? 50;
    const offset = filter.offset ?? 0;
    const envelope = await this.http.request<unknown>(tasksList.path, {
      query: serializeTaskFilter({ ...filter, perPage, offset }),
      raw: true,
    });

    const obj = envelope && typeof envelope === "object" ? (envelope as Record<string, unknown>) : {};
    const items = Array.isArray(obj.tasks) ? obj.tasks.map(mapTask) : [];
    const hasMore = Boolean(obj.hasMore);

    return { items, hasMore, offset, perPage };
  }

  async byId(id: TaskId): Promise<Task> {
    const ep = taskById(id);
    try {
      const dto = await this.http.request<unknown>(ep.path, { envelopeKey: ep.envelopeKey });
      return mapTask(dto);
    } catch (err) {
      if (err instanceof DomainError && err.code === "NOT_FOUND") {
        throw new DomainError(
          "NOT_FOUND",
          `Task ${id} not found or deleted. Try search with all=true if it may be archived.`,
          { cause: err },
        );
      }
      throw err;
    }
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const dto = await this.http.request<unknown>(tasksList.path, {
      method: "POST",
      body: input,
      envelopeKey: "task",
      noRetry: true,
    });
    return mapTask(dto);
  }

  async update(id: TaskId, input: UpdateTaskInput): Promise<Task> {
    const ep = taskById(id);
    const dto = await this.http.request<unknown>(ep.path, {
      method: "PUT",
      body: input,
      envelopeKey: ep.envelopeKey,
    });
    return mapTask(dto);
  }

  async delete(id: TaskId): Promise<void> {
    await this.http.request(taskById(id).path, {
      method: "DELETE",
      noRetry: true,
    });
  }

  async setBoard(id: TaskId, boardId: BoardId): Promise<void> {
    await this.http.request(`/tm/tasks/${id}/board`, {
      method: "POST",
      body: { boardId },
      noRetry: true,
    });
  }

  async setBoardColumn(id: TaskId, boardColumnId: BoardColumnId): Promise<void> {
    await this.http.request(`/tm/tasks/${id}/board-column`, {
      method: "POST",
      body: { boardColumnId },
      noRetry: true,
    });
  }

  async addLocation(id: TaskId, input: AddTaskLocationInput): Promise<void> {
    await this.http.request(`/tm/tasks/${id}/locations`, {
      method: "POST",
      body: input,
      noRetry: true,
    });
  }

  async tree(id: TaskId, depth: number): Promise<TaskTreeNode> {
    const maxDepth = Math.max(0, Math.min(depth, 5));
    const root = await this.byId(id);
    return this.buildNode(root, maxDepth, 0, new Set([id]));
  }

  private async buildNode(
    task: Task,
    maxDepth: number,
    current: number,
    seen: Set<number>,
  ): Promise<TaskTreeNode> {
    if (current >= maxDepth || task.subTaskIds.length === 0) {
      return { task, children: [] };
    }
    const children: TaskTreeNode[] = [];
    for (const childId of task.subTaskIds) {
      if (seen.has(childId)) continue;
      seen.add(childId);
      try {
        const child = await this.byId(childId);
        children.push(await this.buildNode(child, maxDepth, current + 1, seen));
      } catch {
        // Skip missing children rather than failing the whole tree.
      }
    }
    return { task, children };
  }
}
