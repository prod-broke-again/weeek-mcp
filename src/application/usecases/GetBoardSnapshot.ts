import type { ProjectRepository } from "../../domain/ports/ProjectRepository.js";
import type { TaskRepository } from "../../domain/ports/TaskRepository.js";
import type { Config } from "../../infrastructure/config/Config.js";
import { assertProjectAllowed, resolveProjectId } from "../../infrastructure/config/Config.js";
import type { NameResolver } from "../enrichment/NameResolver.js";
import { presentTaskCompact } from "../presenters/TaskPresenter.js";
import { DomainError } from "../../domain/shared/errors.js";

export class GetBoardSnapshot {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly tasks: TaskRepository,
    private readonly config: Config,
    private readonly names: NameResolver,
  ) {}

  async execute(input: {
    projectId?: number | string;
    boardId: number;
    perColumn?: number;
    includeCompleted?: boolean;
  }) {
    const projectId = resolveProjectId(this.config, input.projectId);
    if (projectId === undefined) {
      throw new DomainError("VALIDATION", "projectId is required (or set WEEEK_DEFAULT_PROJECT_ID)");
    }
    assertProjectAllowed(this.config, projectId);

    const boards = await this.projects.boards(projectId);
    const board = boards.find((b) => b.id === input.boardId);
    if (!board) {
      throw new DomainError("NOT_FOUND", `Board ${input.boardId} not found in project ${projectId}`);
    }

    const columns = await this.projects.columns(board.id, projectId);
    const limit = input.perColumn ?? 20;
    const [users, tags] = await Promise.all([
      this.names.resolveUsers([]),
      this.names.resolveTags([]),
    ]);

    const sections: string[] = [`# Board #${board.id}: ${board.name}`, ""];
    const structuredColumns: Array<Record<string, unknown>> = [];

    for (const col of columns) {
      const page = await this.tasks.find({
        projectId,
        boardId: board.id,
        boardColumnId: col.id,
        completed: input.includeCompleted ? undefined : false,
        perPage: limit,
        offset: 0,
      });
      const moreUsers = await this.names.resolveUsers(
        page.items.flatMap((t) => [...t.assignees, t.authorId]),
      );
      Object.assign(users, moreUsers);
      const moreTags = await this.names.resolveTags(page.items.flatMap((t) => t.tags));
      Object.assign(tags, moreTags);

      sections.push(`## ${col.name} (#${col.id}) — ${page.items.length}${page.hasMore ? "+" : ""}`);
      if (page.items.length === 0) sections.push("_empty_");
      else for (const t of page.items) sections.push(presentTaskCompact(t, { users, tags }));
      sections.push("");

      structuredColumns.push({
        id: col.id,
        name: col.name,
        hasMore: page.hasMore,
        tasks: page.items.map((t) => ({
          id: t.id,
          title: t.title,
          isCompleted: t.isCompleted,
          priority: t.priority,
          dueDate: t.dueDate,
        })),
      });
    }

    return {
      markdown: sections.join("\n"),
      structured: {
        board,
        columns: structuredColumns,
      },
    };
  }
}
