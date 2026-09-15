import type { ProjectDocumentsResult } from "../document/entities.js";
import type { ProjectId } from "../shared/types.js";

export interface SessionDocumentRepository {
  getProjectDocuments(projectId: ProjectId): Promise<ProjectDocumentsResult>;
}
