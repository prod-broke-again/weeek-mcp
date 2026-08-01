import type { Task, TaskFilter, TaskPage, TaskTreeNode } from "../task/entities.js";
import type { TaskId } from "../shared/types.js";

export interface TaskRepository {
  find(filter: TaskFilter): Promise<TaskPage>;
  byId(id: TaskId): Promise<Task>;
  tree(id: TaskId, depth: number): Promise<TaskTreeNode>;
}
