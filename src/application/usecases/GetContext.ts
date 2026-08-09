import type { DirectoryRepository } from "../../domain/ports/DirectoryRepository.js";
import type { ProjectRepository } from "../../domain/ports/ProjectRepository.js";
import type { SessionCommentRepository } from "../../domain/ports/SessionCommentRepository.js";
import type { Config } from "../../infrastructure/config/Config.js";
import { aliasForProject, presentProjects } from "../presenters/ProjectPresenter.js";
import { memberDisplayName } from "../../domain/workspace/entities.js";

export class GetContext {
  constructor(
    private readonly directory: DirectoryRepository,
    private readonly projects: ProjectRepository,
    private readonly config: Config,
    private readonly comments: SessionCommentRepository,
  ) {}

  async execute() {
    const [me, workspace, projects, sessionReady] = await Promise.all([
      this.directory.me(),
      this.directory.workspace(),
      this.projects.list(),
      this.comments.probe().then((p) => p.ok),
    ]);

    const sessionComments = sessionReady ? "ready" : "missing";

    const markdown = [
      "# Weeek MCP context",
      "",
      `**User:** ${memberDisplayName(me)} <${me.email}> (\`${me.id}\`)`,
      `**Workspace:** ${workspace.title} (#${workspace.id})`,
      `**Default project:** ${this.config.defaultProjectId ?? "(not set — pass projectId or alias)"}`,
      `**Whitelist:** ${this.config.readOnlyProjects.length ? this.config.readOnlyProjects.join(", ") : "(all visible projects)"}`,
      `**Write tools:** ${this.config.allowWrite ? "enabled" : "disabled (WEEEK_ALLOW_WRITE=false)"}`,
      `**Session comments:** ${sessionComments}${sessionComments === "missing" ? " — call `weeek_auth_status`" : ""}`,
      `**Max attachment:** ${this.config.maxAttachmentBytes} bytes`,
      "",
      "## Write policy",
      "- Never create, edit, move, or delete a task unless the user explicitly asked for that exact change.",
      "- Write flow is always: `weeek_propose_*` → show preview → wait for explicit user confirmation → `weeek_confirm_write`.",
      "- Never call `weeek_confirm_write` on your own initiative. Tokens are single-use and expire.",
      "",
      "## API limits (honest)",
      "- Task comments: via browser session only (not Public API)",
      "- No Weeek Docs / Wiki in Public API — only task attachments",
      "- Attachment URLs (service=weeek) expire in ~1 hour",
      "",
      "## Projects",
      presentProjects(projects, this.config),
      "",
      "## Suggested next calls",
      "1. `weeek_search_tasks` — find work",
      "2. `weeek_get_task` — full card + comments (if session ready) + attachment ids",
      "3. `weeek_read_attachment` — view image/text",
    ].join("\n");

    return {
      markdown,
      structured: {
        user: { id: me.id, email: me.email, name: memberDisplayName(me) },
        workspace: { id: workspace.id, title: workspace.title },
        defaultProjectId: this.config.defaultProjectId ?? null,
        readOnlyProjects: this.config.readOnlyProjects,
        allowWrite: this.config.allowWrite,
        sessionComments,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          alias: aliasForProject(this.config, p.id) ?? null,
          isDefault: this.config.defaultProjectId === p.id,
        })),
        capabilities: {
          comments: sessionReady,
          weeekDocs: false,
          attachments: true,
          write: this.config.allowWrite,
        },
        writeFlow: "propose_confirm",
      },
    };
  }
}
