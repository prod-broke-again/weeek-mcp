import type { DirectoryRepository } from "../../domain/ports/DirectoryRepository.js";
import type { TaskRepository } from "../../domain/ports/TaskRepository.js";
import type { Config } from "../../infrastructure/config/Config.js";
import { assertProjectAllowed, resolveProjectId } from "../../infrastructure/config/Config.js";
import type { NameResolver } from "../enrichment/NameResolver.js";
import { presentTaskList, taskToStructured } from "../presenters/TaskPresenter.js";

export class GetMyTasks {
  constructor(
    private readonly directory: DirectoryRepository,
    private readonly tasks: TaskRepository,
    private readonly config: Config,
    private readonly names: NameResolver,
  ) {}

  async execute(input: { projectId?: number | string; perPage?: number; offset?: number }) {
    const me = await this.directory.me();
    const projectId = resolveProjectId(this.config, input.projectId);
    if (projectId !== undefined) assertProjectAllowed(this.config, projectId);

    const page = await this.tasks.find({
      userId: me.id,
      projectId,
      completed: false,
      sortBy: "date",
      perPage: input.perPage ?? 30,
      offset: input.offset ?? 0,
    });

    const [users, tags] = await Promise.all([
      this.names.resolveUsers(page.items.flatMap((t) => [...t.assignees, t.authorId])),
      this.names.resolveTags(page.items.flatMap((t) => t.tags)),
    ]);
    const maps = { users, tags };

    return {
      markdown: [
        `Open tasks for ${me.email} (${page.items.length}${page.hasMore ? ", hasMore" : ""})`,
        "",
        presentTaskList(page.items, maps, page.hasMore),
      ].join("\n"),
      structured: {
        userId: me.id,
        hasMore: page.hasMore,
        tasks: page.items.map((t) => taskToStructured(t, maps)),
      },
    };
  }
}
