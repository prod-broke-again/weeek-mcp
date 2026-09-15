import type { ProjectId, UserId } from "../shared/types.js";

export interface WeeekDocument {
  id: number;
  projectId: ProjectId;
  name: string;
  lastUpdatedAt: string | null;
  ownerId: UserId | null;
  markdown: string;
  rawContent?: unknown;
}

export interface ProjectDocumentsResult {
  projectId: ProjectId;
  documents: WeeekDocument[];
}
