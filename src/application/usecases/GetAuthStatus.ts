import type { SessionCommentRepository } from "../../domain/ports/SessionCommentRepository.js";
import type { SessionStore } from "../../infrastructure/session/SessionStore.js";
import { authOnboardingMarkdown } from "../../infrastructure/session/consoleSnippet.js";

export class GetAuthStatus {
  constructor(
    private readonly comments: SessionCommentRepository,
    private readonly store: SessionStore,
  ) {}

  async execute() {
    const configured = await this.comments.hasSessionConfigured();
    const probe = configured ? await this.comments.probe() : { ok: false as const, reason: "no_session" };
    const ready = probe.ok;

    const lines = [
      "# Weeek session auth (comments)",
      "",
      `- Configured: ${configured ? "yes" : "no"}`,
      `- Valid: ${ready ? "yes" : "no"}`,
      `- Workspace: ${probe.workspaceId ?? "—"}`,
      `- Session file: \`${this.store.filePath}\``,
      "",
    ];

    if (ready) {
      lines.push("Session is ready. `weeek_get_task` will include comments; or use `weeek_get_task_comments`.");
    } else {
      lines.push(authOnboardingMarkdown(this.store.filePath));
    }

    return {
      markdown: lines.join("\n"),
      structured: {
        sessionComments: ready ? "ready" : "missing",
        configured,
        valid: ready,
        workspaceId: probe.workspaceId ?? null,
        sessionFilePath: this.store.filePath,
        reason: ready ? null : (probe.reason ?? "no_session"),
      },
    };
  }
}
