import type { TaskCommentsResult } from "../task/Comment.js";
import type { TaskId } from "../shared/types.js";

export interface SessionProbeResult {
  ok: boolean;
  workspaceId?: number;
  reason?: string;
}

export interface SessionCommentRepository {
  /** True if a session payload is configured (file/env), not necessarily valid. */
  hasSessionConfigured(): Promise<boolean>;
  probe(): Promise<SessionProbeResult>;
  getTaskComments(taskId: TaskId): Promise<TaskCommentsResult>;
}
