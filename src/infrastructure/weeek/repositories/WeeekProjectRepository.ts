import type { ProjectRepository } from "../../../domain/ports/ProjectRepository.js";
import type { Board, BoardColumn, Project } from "../../../domain/project/entities.js";
import type { BoardId, ProjectId } from "../../../domain/shared/types.js";
import type { Config } from "../../config/Config.js";
import { assertProjectAllowed } from "../../config/Config.js";
import type { Cache } from "../../../domain/ports/Cache.js";
import type { WeeekHttpClient } from "../WeeekHttpClient.js";
import { mapBoard, mapBoardColumn, mapProject } from "../mappers/projectMapper.js";
import {
  boardColumnsList,
  boardsList,
  projectById,
  projectsList,
} from "../endpoints/projects.js";

export class WeeekProjectRepository implements ProjectRepository {
  constructor(
    private readonly http: WeeekHttpClient,
    private readonly config: Config,
    private readonly cache: Cache,
  ) {}

  async list(): Promise<Project[]> {
    const cached = this.cache.get<Project[]>("projects:list");
    if (cached) return this.filterWhitelist(cached);

    const dto = await this.http.request<unknown[]>(projectsList.path, {
      envelopeKey: projectsList.envelopeKey,
    });
    const projects = (Array.isArray(dto) ? dto : []).map(mapProject);
    this.cache.set("projects:list", projects);
    return this.filterWhitelist(projects);
  }

  async byId(id: ProjectId): Promise<Project> {
    assertProjectAllowed(this.config, id);
    const key = `projects:${id}`;
    const cached = this.cache.get<Project>(key);
    if (cached) return cached;

    const ep = projectById(id);
    const dto = await this.http.request<unknown>(ep.path, { envelopeKey: ep.envelopeKey });
    const project = mapProject(dto);
    this.cache.set(key, project);
    return project;
  }

  async boards(projectId: ProjectId): Promise<Board[]> {
    assertProjectAllowed(this.config, projectId);
    const key = `boards:${projectId}`;
    const cached = this.cache.get<Board[]>(key);
    if (cached) return cached;

    const dto = await this.http.request<unknown[]>(boardsList.path, {
      envelopeKey: boardsList.envelopeKey,
      query: { projectId },
    });
    const boards = (Array.isArray(dto) ? dto : []).map(mapBoard);
    this.cache.set(key, boards);
    return boards;
  }

  async columns(boardId?: BoardId, projectId?: ProjectId): Promise<BoardColumn[]> {
    if (projectId !== undefined) assertProjectAllowed(this.config, projectId);
    const key = `columns:${boardId ?? "all"}:${projectId ?? "all"}`;
    const cached = this.cache.get<BoardColumn[]>(key);
    if (cached) return cached;

    const dto = await this.http.request<unknown[]>(boardColumnsList.path, {
      envelopeKey: boardColumnsList.envelopeKey,
      query: {
        boardId,
        // Spec accepts boardId; some workspaces also filter via boards list first.
      },
    });
    let columns = (Array.isArray(dto) ? dto : []).map(mapBoardColumn);
    if (boardId !== undefined) {
      columns = columns.filter((c) => c.boardId === boardId);
    }
    this.cache.set(key, columns);
    return columns;
  }

  private filterWhitelist(projects: Project[]): Project[] {
    if (this.config.readOnlyProjects.length === 0) return projects;
    const allow = new Set(this.config.readOnlyProjects);
    return projects.filter((p) => allow.has(p.id));
  }
}
