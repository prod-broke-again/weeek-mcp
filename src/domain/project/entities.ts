import type { BoardColumnId, BoardId, ProjectId, UserId } from "../shared/types.js";

export interface Project {
  id: ProjectId;
  name: string;
  description: string | null;
  color: string;
  status: number;
  isPrivate: boolean;
  portfolioId: number | null;
  logoLink: string | null;
  team: UserId[];
}

export interface Board {
  id: BoardId;
  name: string;
  projectId: ProjectId;
  isPrivate: boolean;
}

export interface BoardColumn {
  id: BoardColumnId;
  name: string;
  boardId: BoardId;
}

export interface ProjectRef {
  id: ProjectId;
  name: string;
  alias?: string;
}
