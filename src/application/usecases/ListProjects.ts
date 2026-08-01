import type { ProjectRepository } from "../../domain/ports/ProjectRepository.js";
import type { Config } from "../../infrastructure/config/Config.js";
import { aliasForProject, presentProjects } from "../presenters/ProjectPresenter.js";

export class ListProjects {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly config: Config,
  ) {}

  async execute() {
    const list = await this.projects.list();
    return {
      markdown: presentProjects(list, this.config),
      structured: {
        projects: list.map((p) => ({
          id: p.id,
          name: p.name,
          alias: aliasForProject(this.config, p.id) ?? null,
          isPrivate: p.isPrivate,
          status: p.status,
          portfolioId: p.portfolioId,
        })),
      },
    };
  }
}
