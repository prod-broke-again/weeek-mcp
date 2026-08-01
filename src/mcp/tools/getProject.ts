import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";
import { projectIdInput } from "./shared.js";

export function createGetProjectTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_get_project",
    title: "Get Weeek project overview",
    description:
      "Project overview: boards, columns, team size. Use when you need board/column ids before weeek_get_board or weeek_search_tasks.",
    tier: "read",
    inputSchema: z.object({
      projectId: projectIdInput,
    }),
    execute: async (input) => {
      const result = await deps.getProjectOverview.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
