import type { SessionDocumentRepository } from "../../domain/ports/SessionDocumentRepository.js";
import type { SessionCommentRepository } from "../../domain/ports/SessionCommentRepository.js";
import type { SessionStore } from "../../infrastructure/session/SessionStore.js";
import { DomainError } from "../../domain/shared/errors.js";
import { authOnboardingMarkdown } from "../../infrastructure/session/consoleSnippet.js";
import { documentsToStructured, presentDocuments } from "../presenters/DocumentPresenter.js";

export class GetProjectDocuments {
  constructor(
    private readonly documents: SessionDocumentRepository,
    private readonly sessionProbe: SessionCommentRepository,
    private readonly store: SessionStore,
  ) {}

  async execute(input: { projectId: number }) {
    const probe = await this.sessionProbe.probe();
    if (!probe.ok) {
      throw new DomainError(
        "UNAUTHORIZED",
        `${authOnboardingMarkdown(this.store.filePath)}\n\n(Cannot load documents for project #${input.projectId} without a valid session.)`,
      );
    }

    const result = await this.documents.getProjectDocuments(input.projectId);
    return {
      markdown: presentDocuments(result),
      structured: documentsToStructured(result),
    };
  }
}
