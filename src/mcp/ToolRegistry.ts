import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpTool } from "./McpTool.js";
import { mapToolError, sanitizeErrorText } from "./errors/toolErrorMapper.js";
import type { Config } from "../infrastructure/config/Config.js";
import type { Logger } from "../domain/ports/Logger.js";
import { textResult } from "./McpTool.js";

export class ToolRegistry {
  private readonly tools: McpTool[] = [];

  constructor(
    private readonly config: Config,
    private readonly logger: Logger,
  ) {}

  register(tool: McpTool): void {
    this.tools.push(tool);
  }

  list(): McpTool[] {
    return this.tools.filter((t) => t.tier === "read" || this.config.allowWrite);
  }

  apply(server: McpServer): void {
    for (const tool of this.list()) {
      server.registerTool(
        tool.name,
        {
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
        },
        async (args) => {
          try {
            const parsed = tool.inputSchema.parse(args ?? {});
            return await tool.execute(parsed);
          } catch (err) {
            this.logger.error("tool failed", { tool: tool.name, err: String(err) });
            const mapped = mapToolError(err);
            return textResult(
              sanitizeErrorText(mapped.message, this.config.apiToken),
              undefined,
              true,
            );
          }
        },
      );
    }
  }
}
