import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";

export function createListMembersTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_list_members",
    title: "List Weeek members",
    description:
      "Workspace members (id, name, email). Use to resolve assignee UUIDs for weeek_search_tasks userId filter.",
    tier: "read",
    inputSchema: z.object({}),
    execute: async () => {
      const result = await deps.listMembers.execute();
      return textResult(result.markdown, result.structured);
    },
  };
}
