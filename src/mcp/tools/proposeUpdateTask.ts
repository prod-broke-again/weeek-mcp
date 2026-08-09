import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";
import { dateInput, dateTimeInput, proposeWriteRule } from "./shared.js";

export function createProposeUpdateTaskTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_propose_update_task",
    title: "Propose editing a Weeek task",
    description: `Prepare a field-by-field preview for editing one existing Weeek task. ${proposeWriteRule} The public OpenAPI does not document description on update; if requested it is sent transparently and an API rejection is returned without being hidden.`,
    tier: "write",
    inputSchema: z.object({
      taskId: z.number().int().positive(),
      title: z.string().min(1).max(255).nullable().optional(),
      description: z.string().nullable().optional(),
      priority: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).nullable().optional(),
      type: z.enum(["action", "meet", "call"]).nullable().optional(),
      startDate: dateInput.describe("Start date YYYY-MM-DD"),
      dueDate: dateInput.describe("Due date YYYY-MM-DD"),
      startDateTime: dateTimeInput.describe("Start datetime in ISO 8601"),
      dueDateTime: dateTimeInput.describe("Due datetime in ISO 8601"),
      duration: z.number().int().nonnegative().nullable().optional().describe("Estimate in minutes"),
      tags: z.array(z.number().int().positive()).optional(),
      customFields: z.record(z.string(), z.unknown()).optional(),
    }),
    execute: async (input) => {
      const result = await deps.proposeUpdateTask.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
