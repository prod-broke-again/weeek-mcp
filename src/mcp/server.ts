import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppDeps } from "./deps.js";
import { ToolRegistry } from "./ToolRegistry.js";
import { registerAllTools } from "./tools/index.js";

export function createMcpServer(deps: AppDeps): McpServer {
  const server = new McpServer({
    name: "weeek-mcp-server",
    version: "0.1.0",
  });

  const registry = new ToolRegistry(deps.config, deps.logger);
  registerAllTools(registry, deps);
  registry.apply(server);

  deps.logger.info("MCP tools registered", {
    tools: registry.list().map((t) => t.name),
  });

  return server;
}
