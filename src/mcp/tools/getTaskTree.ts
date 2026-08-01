import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";

export function createGetTaskTreeTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_get_task_tree",
    title: "Get Weeek task tree",
    description:
      "Task plus subtasks resolved recursively (subTasks are ids in the API). Default depth 2, max 5.",
    tier: "read",
    inputSchema: z.object({
      taskId: z.number().int().positive(),
      depth: z.number().int().min(0).max(5).optional().describe("Recursion depth (default 2)"),
    }),
    execute: async (input) => {
      const result = await deps.getTaskTree.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
