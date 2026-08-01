import { z } from "zod";

/** projectId may be numeric id or configured alias string. */
export const projectIdInput = z
  .union([z.number().int().positive(), z.string().min(1)])
  .optional()
  .describe("Project id or alias. Defaults to WEEEK_DEFAULT_PROJECT_ID.");
