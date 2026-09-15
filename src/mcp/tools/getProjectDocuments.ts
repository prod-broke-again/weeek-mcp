import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";

export function createGetProjectDocumentsTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_get_project_documents",
    title: "Get Weeek project documents",
    description:
      "Load all documents and their parsed Markdown contents for a project via browser session (private API). Requires weeek_session_import first; see weeek_auth_status.",
    tier: "read",
    inputSchema: z.object({
      projectId: z.number().int().positive().describe("Numeric project id"),
    }),
    execute: async (input) => {
      const result = await deps.getProjectDocuments.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
