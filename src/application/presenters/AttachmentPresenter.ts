import type { Attachment, AttachmentContent } from "../../domain/attachment/entities.js";
import { wrapUntrusted } from "./untrusted.js";

export function presentAttachmentMeta(a: Attachment): string {
  const size = a.size !== null ? `${a.size} bytes` : "size unknown";
  return [
    `# Attachment ${a.name}`,
    `- id: \`${a.id}\``,
    `- service: ${a.service}`,
    `- size: ${size}`,
    `- createdAt: ${a.createdAt}`,
    `- url: ${a.url}`,
    "",
    "_URL for weeek service is valid ~1 hour. Do not cache URLs — re-fetch via weeek_read_attachment._",
  ].join("\n");
}

export function presentAttachmentText(content: AttachmentContent): string {
  const header = presentAttachmentMeta(content.attachment);
  const note = content.note ? `\n\n> ${content.note}` : "";
  const body = content.text
    ? `\n\n## Content\n${wrapUntrusted(`attachment-${content.attachment.id}`, content.text)}`
    : "";
  return `${header}${note}${body}`;
}
