import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";
import { projectIdInput } from "./shared.js";

export function createGetBoardTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_get_board",
    title: "Get Weeek board snapshot",
    description:
      "Snapshot of a board: columns with tasks (limited per column). Prefer over dumping all tasks when you want a kanban view. Get boardId via weeek_get_project.",
    tier: "read",
    inputSchema: z.object({
      projectId: projectIdInput,
      boardId: z.number().int().positive().describe("Board id from weeek_get_project"),
      perColumn: z.number().int().positive().max(100).optional().describe("Max tasks per column (default 20)"),
      includeCompleted: z.boolean().optional().describe("Include completed tasks (default false)"),
    }),
    execute: async (input) => {
      const result = await deps.getBoardSnapshot.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
