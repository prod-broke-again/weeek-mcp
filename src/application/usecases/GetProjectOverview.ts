import type { ProjectRepository } from "../../domain/ports/ProjectRepository.js";
import type { Config } from "../../infrastructure/config/Config.js";
import { assertProjectAllowed, resolveProjectId } from "../../infrastructure/config/Config.js";
import { presentProjectOverview } from "../presenters/ProjectPresenter.js";
import type { BoardColumn } from "../../domain/project/entities.js";
import { DomainError } from "../../domain/shared/errors.js";

export class GetProjectOverview {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly config: Config,
  ) {}

  async execute(input: { projectId?: number | string }) {
    const projectId = resolveProjectId(this.config, input.projectId);
    if (projectId === undefined) {
      throw new DomainError(
        "VALIDATION",
        "projectId is required (or set WEEEK_DEFAULT_PROJECT_ID)",
      );
    }
    assertProjectAllowed(this.config, projectId);

    const [project, boards] = await Promise.all([
      this.projects.byId(projectId),
      this.projects.boards(projectId),
    ]);

    const columnsByBoard = new Map<number, BoardColumn[]>();
    await Promise.all(
      boards.map(async (b) => {
        columnsByBoard.set(b.id, await this.projects.columns(b.id, projectId));
      }),
    );

    return {
      markdown: presentProjectOverview(project, boards, columnsByBoard, this.config),
      structured: {
        project,
        boards: boards.map((b) => ({
          ...b,
          columns: columnsByBoard.get(b.id) ?? [],
        })),
      },
    };
  }
}
