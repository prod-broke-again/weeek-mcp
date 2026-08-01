import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";

export function createListTagsTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_list_tags",
    title: "List Weeek tags",
    description: "Workspace tags (id, title, color). Use to resolve tag ids in search filters and task cards.",
    tier: "read",
    inputSchema: z.object({}),
    execute: async () => {
      const result = await deps.listTags.execute();
      return textResult(result.markdown, result.structured);
    },
  };
}
