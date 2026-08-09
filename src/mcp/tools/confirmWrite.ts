import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";

export function createConfirmWriteTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_confirm_write",
    title: "Confirm a pending Weeek write",
    description:
      "THE ONLY TOOL THAT MUTATES WEEEK. HARD RULE: Call only after the user explicitly confirmed the exact pending preview in a separate message, for example “Да”, “подтверждаю”, or “yes”. Never infer confirmation, never confirm on your own initiative, and never reuse an older token for a different request. Pass only the single-use confirmationToken returned by the latest matching weeek_propose_* call. Unknown, used, or expired tokens require a new proposal and a new user confirmation.",
    tier: "write",
    inputSchema: z.object({
      confirmationToken: z
        .string()
        .min(20)
        .describe("Single-use token from the matching weeek_propose_* preview"),
    }),
    execute: async (input) => {
      const result = await deps.confirmWrite.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
