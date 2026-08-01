import type {
  SessionCommentRepository,
  SessionProbeResult,
} from "../../../domain/ports/SessionCommentRepository.js";
import type { TaskCommentsResult } from "../../../domain/task/Comment.js";
import type { TaskId } from "../../../domain/shared/types.js";
import { DomainError } from "../../../domain/shared/errors.js";
import type { SessionStore } from "../../session/SessionStore.js";
import type { WeeekSessionClient } from "../WeeekSessionClient.js";
import { mapTaskCommentsResponse } from "../mappers/commentMapper.js";
import type { Logger } from "../../../domain/ports/Logger.js";

export class WeeekSessionCommentRepository implements SessionCommentRepository {
  private probeCache: { at: number; result: SessionProbeResult } | null = null;
  private readonly probeTtlMs = 60_000;

  constructor(
    private readonly store: SessionStore,
    private readonly client: WeeekSessionClient,
    private readonly logger: Logger,
  ) {}

  async hasSessionConfigured(): Promise<boolean> {
    return (await this.store.load()) !== null;
  }

  async probe(): Promise<SessionProbeResult> {
    const now = Date.now();
    if (this.probeCache && now - this.probeCache.at < this.probeTtlMs) {
      return this.probeCache.result;
    }

    const session = await this.store.load();
    if (!session) {
      const result: SessionProbeResult = { ok: false, reason: "no_session" };
      this.probeCache = { at: now, result };
      return result;
    }

    try {
      // Any authenticated response proves the cookie works (404 = ok, 401 = expired).
      await this.client.getJson(`/ws/${session.workspaceId}/tm/tasks/1`, session, {
        query: { withSubtasks: 1 },
      });
      const result: SessionProbeResult = { ok: true, workspaceId: session.workspaceId };
      this.probeCache = { at: now, result };
      return result;
    } catch (err) {
      const status = err && typeof err === "object" && "status" in err ? Number((err as { status: unknown }).status) : undefined;
      if (status === 404) {
        const result: SessionProbeResult = { ok: true, workspaceId: session.workspaceId };
        this.probeCache = { at: now, result };
        return result;
      }
      this.logger.warn("session probe failed", { err: String(err) });
      this.store.invalidateCache();
      const result: SessionProbeResult = {
        ok: false,
        workspaceId: session.workspaceId,
        reason: "invalid_session",
      };
      this.probeCache = { at: now, result };
      return result;
    }
  }

  async getTaskComments(taskId: TaskId): Promise<TaskCommentsResult> {
    const session = await this.store.load();
    if (!session) {
      throw new DomainError(
        "UNAUTHORIZED",
        "No Weeek browser session configured. Call weeek_auth_status for import instructions.",
      );
    }

    try {
      const envelope = await this.client.getJson(
        `/ws/${session.workspaceId}/tm/tasks/${taskId}`,
        session,
        { query: { withSubtasks: 1 } },
      );
      return mapTaskCommentsResponse(taskId, envelope);
    } catch (err) {
      if (err instanceof DomainError && err.code === "UNAUTHORIZED") {
        this.probeCache = null;
        this.store.invalidateCache();
      }
      throw err;
    }
  }

  /** Clear probe cache after successful import. */
  resetProbeCache(): void {
    this.probeCache = null;
  }
}
