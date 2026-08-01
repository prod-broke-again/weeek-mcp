import type { DirectoryRepository } from "../../domain/ports/DirectoryRepository.js";
import type { ProjectRepository } from "../../domain/ports/ProjectRepository.js";
import type { Logger } from "../../domain/ports/Logger.js";
import { memberDisplayName } from "../../domain/workspace/entities.js";
import type { BoardColumnId, BoardId, ProjectId, TagId, UserId } from "../../domain/shared/types.js";

export interface ResolvedNames {
  users: Record<string, string>;
  tags: Record<number, string>;
  projects: Record<number, string>;
  boards: Record<number, string>;
  columns: Record<number, string>;
}

/**
 * Resolves UUID / numeric ids to human-readable names.
 * Failures degrade gracefully — callers keep raw ids.
 */
export class NameResolver {
  constructor(
    private readonly directory: DirectoryRepository,
    private readonly projects: ProjectRepository,
    private readonly logger: Logger,
  ) {}

  async resolveUsers(ids: UserId[]): Promise<Record<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return {};
    try {
      const members = await this.directory.members();
      const map: Record<string, string> = {};
      for (const m of members) {
        map[m.id] = memberDisplayName(m);
      }
      const out: Record<string, string> = {};
      for (const id of unique) out[id] = map[id] ?? id;
      return out;
    } catch (err) {
      this.logger.warn("NameResolver: members failed", { err: String(err) });
      return Object.fromEntries(unique.map((id) => [id, id]));
    }
  }

  async resolveTags(ids: TagId[]): Promise<Record<number, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return {};
    try {
      const tags = await this.directory.tags();
      const map = new Map(tags.map((t) => [t.id, t.title]));
      const out: Record<number, string> = {};
      for (const id of unique) out[id] = map.get(id) ?? String(id);
      return out;
    } catch (err) {
      this.logger.warn("NameResolver: tags failed", { err: String(err) });
      return Object.fromEntries(unique.map((id) => [id, String(id)]));
    }
  }

  async resolveProjects(ids: ProjectId[]): Promise<Record<number, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return {};
    try {
      const projects = await this.projects.list();
      const map = new Map(projects.map((p) => [p.id, p.name]));
      const out: Record<number, string> = {};
      for (const id of unique) {
        if (map.has(id)) out[id] = map.get(id)!;
        else {
          try {
            out[id] = (await this.projects.byId(id)).name;
          } catch {
            out[id] = String(id);
          }
        }
      }
      return out;
    } catch (err) {
      this.logger.warn("NameResolver: projects failed", { err: String(err) });
      return Object.fromEntries(unique.map((id) => [id, String(id)]));
    }
  }

  async resolveBoards(projectId: ProjectId, boardIds: BoardId[]): Promise<Record<number, string>> {
    const unique = [...new Set(boardIds.filter((id): id is number => id !== null))];
    if (unique.length === 0) return {};
    try {
      const boards = await this.projects.boards(projectId);
      const map = new Map(boards.map((b) => [b.id, b.name]));
      return Object.fromEntries(unique.map((id) => [id, map.get(id) ?? String(id)]));
    } catch (err) {
      this.logger.warn("NameResolver: boards failed", { err: String(err) });
      return Object.fromEntries(unique.map((id) => [id, String(id)]));
    }
  }

  async resolveColumns(
    boardIds: BoardId[],
    columnIds: BoardColumnId[],
  ): Promise<Record<number, string>> {
    const unique = [...new Set(columnIds.filter((id): id is number => id !== null))];
    if (unique.length === 0) return {};
    try {
      const out: Record<number, string> = {};
      const boards = [...new Set(boardIds.filter((id): id is number => id !== null))];
      if (boards.length === 0) {
        const all = await this.projects.columns();
        for (const id of unique) {
          out[id] = all.find((c) => c.id === id)?.name ?? String(id);
        }
        return out;
      }
      for (const boardId of boards) {
        const cols = await this.projects.columns(boardId);
        for (const c of cols) out[c.id] = c.name;
      }
      for (const id of unique) if (!(id in out)) out[id] = String(id);
      return out;
    } catch (err) {
      this.logger.warn("NameResolver: columns failed", { err: String(err) });
      return Object.fromEntries(unique.map((id) => [id, String(id)]));
    }
  }
}
