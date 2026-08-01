import { z } from "zod";
import type { AppDeps } from "../deps.js";
import type { McpTool } from "../McpTool.js";
import { imageResult, textResult } from "../McpTool.js";

export function createReadAttachmentTool(deps: AppDeps): McpTool {
  return {
    name: "weeek_read_attachment",
    title: "Read Weeek attachment",
    description:
      "Download/view a task attachment by id (from weeek_get_task). Images → image content; txt/md/json/csv → text; PDF/DOCX → metadata+URL only in v1; external drives → link. URL TTL ~1 hour — never reuse cached URLs.",
    tier: "read",
    inputSchema: z.object({
      attachmentId: z.string().min(1).describe("Attachment UUID from task.attachments"),
    }),
    execute: async (input) => {
      const result = await deps.readAttachment.execute(input);
      if (result.kind === "image" && result.bytes) {
        const base64 = Buffer.from(result.bytes).toString("base64");
        return imageResult(result.markdown, result.mimeType, base64, result.structured);
      }
      return textResult(result.markdown, result.structured);
    },
  };
}
