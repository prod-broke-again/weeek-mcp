import type { Board, BoardColumn, Project } from "../project/entities.js";
import type { BoardId, ProjectId } from "../shared/types.js";

export interface ProjectRepository {
  list(): Promise<Project[]>;
  byId(id: ProjectId): Promise<Project>;
  boards(projectId: ProjectId): Promise<Board[]>;
  columns(boardId?: BoardId, projectId?: ProjectId): Promise<BoardColumn[]>;
}
