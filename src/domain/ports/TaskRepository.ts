import type { Task, TaskFilter, TaskPage, TaskTreeNode } from "../task/entities.js";
import type { TaskId } from "../shared/types.js";
import type {
  AddTaskLocationInput,
  CreateTaskInput,
  UpdateTaskInput,
} from "../task/write.js";
import type { BoardColumnId, BoardId } from "../shared/types.js";

export interface TaskRepository {
  find(filter: TaskFilter): Promise<TaskPage>;
  byId(id: TaskId): Promise<Task>;
  tree(id: TaskId, depth: number): Promise<TaskTreeNode>;
  create(input: CreateTaskInput): Promise<Task>;
  update(id: TaskId, input: UpdateTaskInput): Promise<Task>;
  delete(id: TaskId): Promise<void>;
  setBoard(id: TaskId, boardId: BoardId): Promise<void>;
  setBoardColumn(id: TaskId, boardColumnId: BoardColumnId): Promise<void>;
  addLocation(id: TaskId, input: AddTaskLocationInput): Promise<void>;
}
