import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";

export function createSessionImportTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_session_import",
    title: "Import Weeek browser session",
    description:
      "Save browser session JSON (from weeek_auth_status console snippet on app.weeek.net) so the server can read task comments. Paste the full JSON { workspaceId, cookie }. Probes the private API after save.",
    tier: "read",
    inputSchema: z.object({
      payload: z
        .string()
        .min(1)
        .describe("JSON from console snippet: { workspaceId, cookie } or a Cookie header string (needs WEEEK_WORKSPACE_ID)"),
    }),
    execute: async (input) => {
      const result = await deps.importSession.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
