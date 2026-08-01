import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";

export function createContextTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_context",
    title: "Weeek context",
    description:
      "FIRST CALL. Returns who you are, workspace, visible projects/aliases, default project, and API limits (no comments, no Weeek Docs). Use before searching tasks.",
    tier: "read",
    inputSchema: z.object({}),
    execute: async () => {
      const result = await deps.getContext.execute();
      return textResult(result.markdown, result.structured);
    },
  };
}
