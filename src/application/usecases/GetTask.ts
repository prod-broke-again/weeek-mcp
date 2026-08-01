import type { TaskRepository } from "../../domain/ports/TaskRepository.js";
import type { SessionCommentRepository } from "../../domain/ports/SessionCommentRepository.js";
import type { NameResolver } from "../enrichment/NameResolver.js";
import { presentTaskDetail, taskToStructured } from "../presenters/TaskPresenter.js";
import { presentComments, commentsToStructured } from "../presenters/CommentPresenter.js";
import type { Logger } from "../../domain/ports/Logger.js";

export class GetTask {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly names: NameResolver,
    private readonly comments: SessionCommentRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: { taskId: number }) {
    const task = await this.tasks.byId(input.taskId);
    const projectIds = task.locations.map((l) => l.projectId);
    const boardIds = task.locations.map((l) => l.boardId).filter((id): id is number => id !== null);
    const columnIds = task.locations
      .map((l) => l.boardColumnId)
      .filter((id): id is number => id !== null);

    const [users, tags, projects] = await Promise.all([
      this.names.resolveUsers([...task.assignees, ...task.subscribers, task.authorId]),
      this.names.resolveTags(task.tags),
      this.names.resolveProjects(projectIds),
    ]);

    const boards: Record<number, string> = {};
    const columns: Record<number, string> = {};
    for (const loc of task.locations) {
      Object.assign(boards, await this.names.resolveBoards(loc.projectId, boardIds));
    }
    Object.assign(columns, await this.names.resolveColumns(boardIds, columnIds));

    const maps = { users, tags, projects, boards, columns };
    let markdown = presentTaskDetail(task, maps);
    const structured: Record<string, unknown> = taskToStructured(task, maps);

    const configured = await this.comments.hasSessionConfigured();
    if (!configured) {
      markdown +=
        "\n\n_Comments unavailable (no browser session). Call `weeek_auth_status` to import one._";
      structured.comments = null;
      structured.sessionComments = "missing";
      return { markdown, structured };
    }

    const probe = await this.comments.probe();
    if (!probe.ok) {
      markdown +=
        "\n\n_Comments unavailable (session invalid/expired). Call `weeek_auth_status` to re-import._";
      structured.comments = null;
      structured.sessionComments = "missing";
      return { markdown, structured };
    }

    try {
      const result = await this.comments.getTaskComments(input.taskId);
      markdown += `\n\n${presentComments(result)}`;
      structured.comments = commentsToStructured(result).comments;
      structured.commentsCount = result.commentsCount;
      structured.sessionComments = "ready";
    } catch (err) {
      this.logger.warn("failed to enrich task with comments", { err: String(err) });
      markdown +=
        "\n\n_Comments failed to load. Try `weeek_get_task_comments` or `weeek_auth_status`._";
      structured.comments = null;
      structured.sessionComments = "error";
    }

    return { markdown, structured };
  }
}
