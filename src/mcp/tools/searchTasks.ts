import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { textResult } from "../McpTool.js";
import { projectIdInput } from "./shared.js";

export function createSearchTasksTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_search_tasks",
    title: "Search Weeek tasks",
    description:
      "Primary workhorse. Search/filter tasks (search text, board/column, assignee, tags, dates, completed). Returns compact rows. Use weeek_get_task for full card + attachment ids. Paginate with offset/perPage (hasMore, no total).",
    tier: "read",
    inputSchema: z.object({
      projectId: projectIdInput,
      search: z.string().optional().describe("Search in title+description"),
      boardId: z.number().int().positive().optional(),
      boardColumnId: z.number().int().positive().optional(),
      userId: z.string().uuid().optional().describe("Assignee user UUID (from weeek_list_members)"),
      completed: z.boolean().optional(),
      type: z.enum(["action", "meet", "call"]).optional(),
      priority: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
      tags: z.array(z.number().int().positive()).optional(),
      day: z.string().optional().describe("Filter day (API format)"),
      startDate: z.string().optional().describe("Range start Y-m-d or dd.mm.yyyy (pair with endDate)"),
      endDate: z.string().optional().describe("Range end Y-m-d or dd.mm.yyyy"),
      all: z.boolean().optional().describe("Include archived/deleted-ish per API"),
      sortBy: z.string().optional().describe("name|type|priority|duration|overdue|created|date|start; prefix - for DESC"),
      perPage: z.number().int().positive().max(100).optional(),
      offset: z.number().int().nonnegative().optional(),
    }),
    execute: async (input) => {
      const result = await deps.searchTasks.execute(input);
      return textResult(result.markdown, result.structured);
    },
  };
}
