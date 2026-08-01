import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin/weeek-mcp.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist/bin",
  clean: true,
  sourcemap: true,
  splitting: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Keep SDK external so MCP protocol stays compatible with peer installs.
  external: ["@modelcontextprotocol/sdk"],
});
