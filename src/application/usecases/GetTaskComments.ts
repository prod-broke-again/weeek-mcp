import type { SessionCommentRepository } from "../../domain/ports/SessionCommentRepository.js";
import type { SessionStore } from "../../infrastructure/session/SessionStore.js";
import { DomainError } from "../../domain/shared/errors.js";
import { authOnboardingMarkdown } from "../../infrastructure/session/consoleSnippet.js";
import { commentsToStructured, presentComments } from "../presenters/CommentPresenter.js";

export class GetTaskComments {
  constructor(
    private readonly comments: SessionCommentRepository,
    private readonly store: SessionStore,
  ) {}

  async execute(input: { taskId: number }) {
    const probe = await this.comments.probe();
    if (!probe.ok) {
      throw new DomainError(
        "UNAUTHORIZED",
        `${authOnboardingMarkdown(this.store.filePath)}\n\n(Cannot load comments for task #${input.taskId} without a valid session.)`,
      );
    }

    const result = await this.comments.getTaskComments(input.taskId);
    return {
      markdown: presentComments(result),
      structured: commentsToStructured(result),
    };
  }
}
