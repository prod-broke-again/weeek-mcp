import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";
import { projectIdInput } from "./shared.js";

export function createMyTasksTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_my_tasks",
    title: "My open Weeek tasks",
    description:
      "Open (incomplete) tasks assigned to the token owner, sorted by due date. Sugar over weeek_search_tasks with current user filter.",
    tier: "read",
    inputSchema: z.object({
      projectId: projectIdInput,
      perPage: z.number().int().positive().max(100).optional(),
      offset: z.number().int().nonnegative().optional(),
    }),
    execute: async (input) => {
      const result = await deps.getMyTasks.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
