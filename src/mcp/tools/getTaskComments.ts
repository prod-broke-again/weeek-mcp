import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";

export function createGetTaskCommentsTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_get_task_comments",
    title: "Get Weeek task comments",
    description:
      "Load comments for a task via browser session (private API). Prefer when you only need the discussion thread. Requires weeek_session_import first; see weeek_auth_status. Comments also appear on weeek_get_task when session is ready.",
    tier: "read",
    inputSchema: z.object({
      taskId: z.number().int().positive().describe("Numeric task id"),
    }),
    execute: async (input) => {
      const result = await deps.getTaskComments.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
