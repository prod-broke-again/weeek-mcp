import type { SessionStore } from "../../infrastructure/session/SessionStore.js";
import type { WeeekSessionCommentRepository } from "../../infrastructure/weeek/repositories/WeeekSessionCommentRepository.js";
import { DomainError } from "../../domain/shared/errors.js";

export class ImportSession {
  constructor(
    private readonly store: SessionStore,
    private readonly comments: WeeekSessionCommentRepository,
  ) {}

  async execute(input: { payload: string }) {
    const data = this.store.parseImportPayload(input.payload);
    await this.store.save(data);
    this.comments.resetProbeCache();

    const probe = await this.comments.probe();
    if (!probe.ok) {
      throw new DomainError(
        "UNAUTHORIZED",
        "Session saved but probe failed (cookie expired or wrong workspace). Copy a fresh JSON from app.weeek.net console snippet and import again.",
        { details: { workspaceId: data.workspaceId, reason: probe.reason } },
      );
    }

    return {
      markdown: [
        "# Session imported",
        "",
        `- Workspace: ${probe.workspaceId}`,
        `- Saved to: \`${this.store.filePath}\``,
        "",
        "Comments are available via `weeek_get_task` and `weeek_get_task_comments`.",
      ].join("\n"),
      structured: {
        sessionComments: "ready" as const,
        workspaceId: probe.workspaceId ?? data.workspaceId,
        sessionFilePath: this.store.filePath,
      },
    };
  }
}
