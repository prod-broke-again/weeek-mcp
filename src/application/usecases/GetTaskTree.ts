import type { TaskRepository } from "../../domain/ports/TaskRepository.js";
import type { TaskTreeNode } from "../../domain/task/entities.js";
import type { NameResolver } from "../enrichment/NameResolver.js";
import { presentTaskTree, type TaskNameMaps } from "../presenters/TaskPresenter.js";

export class GetTaskTree {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly names: NameResolver,
  ) {}

  async execute(input: { taskId: number; depth?: number }) {
    const tree = await this.tasks.tree(input.taskId, input.depth ?? 2);
    const maps = await this.enrichTree(tree);
    return {
      markdown: presentTaskTree(tree, maps),
      structured: this.toStructured(tree),
    };
  }

  private async enrichTree(node: TaskTreeNode): Promise<TaskNameMaps> {
    const tasks: TaskTreeNode["task"][] = [];
    const walk = (n: TaskTreeNode) => {
      tasks.push(n.task);
      n.children.forEach(walk);
    };
    walk(node);
    const [users, tags] = await Promise.all([
      this.names.resolveUsers(tasks.flatMap((t) => [...t.assignees, t.authorId])),
      this.names.resolveTags(tasks.flatMap((t) => t.tags)),
    ]);
    return { users, tags };
  }

  private toStructured(node: TaskTreeNode): Record<string, unknown> {
    return {
      id: node.task.id,
      title: node.task.title,
      isCompleted: node.task.isCompleted,
      children: node.children.map((c) => this.toStructured(c)),
    };
  }
}
