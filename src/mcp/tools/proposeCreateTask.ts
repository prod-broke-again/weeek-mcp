import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";
import {
  dateInput,
  dateTimeInput,
  projectIdInput,
  proposeWriteRule,
} from "./shared.js";

export function createProposeCreateTaskTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_propose_create_task",
    title: "Propose creating a Weeek task",
    description: `Prepare and validate a preview for creating one Weeek task. ${proposeWriteRule}`,
    tier: "write",
    inputSchema: z.object({
      title: z.string().min(1).max(255).describe("Task title"),
      description: z.string().nullable().optional().describe("Task description"),
      project: projectIdInput,
      boardColumnId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Target column id. Resolve with weeek_get_board; never guess."),
      day: z
        .string()
        .regex(/^\d{2}\.\d{2}\.\d{4}$/, "Expected DD.MM.YYYY")
        .nullable()
        .optional()
        .describe("Simple task day. Cannot be combined with start/due fields."),
      startDate: dateInput.describe("Start date YYYY-MM-DD"),
      dueDate: dateInput.describe("Due date YYYY-MM-DD"),
      startDateTime: dateTimeInput.describe("Start datetime in ISO 8601"),
      dueDateTime: dateTimeInput.describe("Due datetime in ISO 8601"),
      priority: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).nullable().optional(),
      type: z.enum(["action", "meet", "call"]).optional(),
      assigneeUserId: z.string().min(1).nullable().optional(),
      parentId: z.number().int().positive().nullable().optional(),
      tags: z.array(z.number().int().positive()).optional(),
      customFields: z.record(z.string(), z.unknown()).optional(),
    }),
    execute: async (input) => {
      const result = await deps.proposeCreateTask.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
