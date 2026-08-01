import type { TaskRepository } from "../../domain/ports/TaskRepository.js";
import type { TaskFilter } from "../../domain/task/entities.js";
import type { Config } from "../../infrastructure/config/Config.js";
import { assertProjectAllowed, resolveProjectId } from "../../infrastructure/config/Config.js";
import type { NameResolver } from "../enrichment/NameResolver.js";
import { presentTaskList, taskToStructured, type TaskNameMaps } from "../presenters/TaskPresenter.js";
import { DomainError } from "../../domain/shared/errors.js";

export class SearchTasks {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly config: Config,
    private readonly names: NameResolver,
  ) {}

  async execute(input: TaskFilter & { projectId?: number | string }) {
    const projectId = resolveProjectId(this.config, input.projectId);
    if (projectId !== undefined) assertProjectAllowed(this.config, projectId);

    if (
      this.config.readOnlyProjects.length > 0 &&
      projectId === undefined
    ) {
      throw new DomainError(
        "VALIDATION",
        "projectId is required when WEEEK_READ_ONLY_PROJECTS is set (or set WEEEK_DEFAULT_PROJECT_ID).",
      );
    }

    const filter: TaskFilter = {
      ...input,
      projectId,
      perPage: input.perPage ?? 30,
      offset: input.offset ?? 0,
    };

    const page = await this.tasks.find(filter);
    const maps = await this.enrich(page.items);

    return {
      markdown: [
        `Found ${page.items.length} task(s)${page.hasMore ? " (hasMore)" : ""}`,
        "",
        presentTaskList(page.items, maps, page.hasMore),
      ].join("\n"),
      structured: {
        hasMore: page.hasMore,
        offset: page.offset,
        perPage: page.perPage,
        tasks: page.items.map((t) => taskToStructured(t, maps)),
      },
    };
  }

  private async enrich(tasks: Awaited<ReturnType<TaskRepository["find"]>>["items"]): Promise<TaskNameMaps> {
    const userIds = tasks.flatMap((t) => [...t.assignees, t.authorId]);
    const tagIds = tasks.flatMap((t) => t.tags);
    const [users, tags] = await Promise.all([
      this.names.resolveUsers(userIds),
      this.names.resolveTags(tagIds),
    ]);
    return { users, tags };
  }
}
