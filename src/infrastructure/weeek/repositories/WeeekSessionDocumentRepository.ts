import type { SessionDocumentRepository } from "../../../domain/ports/SessionDocumentRepository.js";
import type { ProjectDocumentsResult } from "../../../domain/document/entities.js";
import type { ProjectId } from "../../../domain/shared/types.js";
import { DomainError } from "../../../domain/shared/errors.js";
import type { SessionStore } from "../../session/SessionStore.js";
import type { WeeekSessionClient } from "../WeeekSessionClient.js";
import { mapProjectDocumentsResponse } from "../mappers/documentMapper.js";
import type { Logger } from "../../../domain/ports/Logger.js";

export class WeeekSessionDocumentRepository implements SessionDocumentRepository {
  constructor(
    private readonly store: SessionStore,
    private readonly client: WeeekSessionClient,
    private readonly logger: Logger,
  ) {}

  async getProjectDocuments(projectId: ProjectId): Promise<ProjectDocumentsResult> {
    const session = await this.store.load();
    if (!session) {
      throw new DomainError(
        "UNAUTHORIZED",
        "No Weeek browser session configured. Call weeek_auth_status for import instructions.",
      );
    }

    try {
      const envelope = await this.client.getProjectDocuments(
        session.workspaceId,
        projectId,
        session,
      );
      return mapProjectDocumentsResponse(projectId, envelope);
    } catch (err) {
      if (
        (err instanceof DomainError && err.code === "UNAUTHORIZED") ||
        (err && typeof err === "object" && "status" in err && (err.status === 401 || err.status === 403))
      ) {
        this.logger.warn("session expired while fetching documents", { projectId, err: String(err) });
        this.store.invalidateCache();
      }
      throw err;
    }
  }
}
