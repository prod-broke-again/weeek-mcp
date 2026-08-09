import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";
import { projectIdInput, proposeWriteRule } from "./shared.js";

export function createProposeMoveTaskTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_propose_move_task",
    title: "Propose moving a Weeek task",
    description: `Prepare and validate a preview for moving one task to a project, board, or column. ${proposeWriteRule}`,
    tier: "write",
    inputSchema: z.object({
      taskId: z.number().int().positive(),
      project: projectIdInput,
      boardId: z.number().int().positive().optional(),
      boardColumnId: z.number().int().positive().optional(),
    }),
    execute: async (input) => {
      const result = await deps.proposeMoveTask.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
