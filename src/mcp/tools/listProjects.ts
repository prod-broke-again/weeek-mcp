import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";

export function createListProjectsTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_list_projects",
    title: "List Weeek projects",
    description:
      "List visible Weeek projects with ids and configured aliases. Prefer weeek_context for the first call; use this to refresh the project list.",
    tier: "read",
    inputSchema: z.object({}),
    execute: async () => {
      const result = await deps.listProjects.execute();
      return textResult(result.markdown, result.structured);
    },
  };
}
