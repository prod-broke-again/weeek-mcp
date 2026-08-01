import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";

export function createGetTaskTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_get_task",
    title: "Get Weeek task",
    description:
      "Full task card: description, assignees/tags/board by name, custom fields, time entries, attachment ids, and comments when a browser session is imported (see weeek_auth_status). Use weeek_read_attachment for files; weeek_get_task_comments for comments-only; weeek_get_task_tree for subtasks.",
    tier: "read",
    inputSchema: z.object({
      taskId: z.number().int().positive().describe("Numeric task id"),
    }),
    execute: async (input) => {
      const result = await deps.getTask.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
