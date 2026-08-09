import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";
import { proposeWriteRule } from "./shared.js";

export function createProposeDeleteTaskTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_propose_delete_task",
    title: "Propose deleting a Weeek task",
    description: `Prepare a destructive-action preview for deleting one task. ${proposeWriteRule}`,
    tier: "write",
    inputSchema: z.object({
      taskId: z.number().int().positive(),
    }),
    execute: async (input) => {
      const result = await deps.proposeDeleteTask.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
