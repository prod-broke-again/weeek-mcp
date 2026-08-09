import { z } from "zod";

/** projectId may be numeric id or configured alias string. */
export const projectIdInput = z
  .union([z.number().int().positive(), z.string().min(1)])
  .optional()
  .describe("Project id or alias. Defaults to WEEEK_DEFAULT_PROJECT_ID.");

export const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .nullable()
  .optional();

export const dateTimeInput = z.string().datetime().nullable().optional();

export const proposeWriteRule =
  "HARD RULE: Call only when the user explicitly asked for this exact Weeek change. Never invent tasks, modify work items on your own initiative, or call this just in case. This tool DOES NOT mutate Weeek: it returns a preview and confirmationToken. Show the preview to the user and WAIT. Call weeek_confirm_write only after a separate explicit user confirmation such as “Да”, “подтверждаю”, or “yes”. Resolve project/board/column ids with weeek_list_projects and weeek_get_board; never guess ids.";
