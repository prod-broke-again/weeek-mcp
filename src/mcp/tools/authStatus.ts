import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";

export function createAuthStatusTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_auth_status",
    title: "Weeek session auth status",
    description:
      "Check whether a browser session is configured for reading task comments (private API). If missing, returns a DevTools console snippet to copy cookies, then use weeek_session_import.",
    tier: "read",
    inputSchema: z.object({}),
    execute: async () => {
      const result = await deps.getAuthStatus.execute();
      return textResult(result.markdown, result.structured);
    },
  };
}
