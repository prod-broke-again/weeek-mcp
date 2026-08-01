import type { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type ToolTier = "read" | "write";

export interface McpTool<TInput extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  title: string;
  description: string;
  tier: ToolTier;
  inputSchema: TInput;
  execute: (input: z.infer<TInput>) => Promise<CallToolResult>;
}

export function textResult(
  markdown: string,
  structuredContent?: Record<string, unknown>,
  isError = false,
): CallToolResult {
  return {
    content: [{ type: "text", text: markdown }],
    ...(structuredContent ? { structuredContent } : {}),
    ...(isError ? { isError: true } : {}),
  };
}

export function imageResult(
  markdown: string,
  mimeType: string,
  base64: string,
  structuredContent?: Record<string, unknown>,
): CallToolResult {
  return {
    content: [
      { type: "text", text: markdown },
      { type: "image", data: base64, mimeType },
    ],
    ...(structuredContent ? { structuredContent } : {}),
  };
}
