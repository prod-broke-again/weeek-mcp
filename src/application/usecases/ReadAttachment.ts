import type { AttachmentRepository } from "../../domain/ports/AttachmentRepository.js";
import { presentAttachmentMeta, presentAttachmentText } from "../presenters/AttachmentPresenter.js";

export class ReadAttachment {
  constructor(private readonly attachments: AttachmentRepository) {}

  async execute(input: { attachmentId: string }) {
    const content = await this.attachments.download(input.attachmentId);

    if (content.kind === "image" && content.bytes) {
      return {
        kind: "image" as const,
        markdown: presentAttachmentMeta(content.attachment),
        mimeType: content.mimeType,
        bytes: content.bytes,
        structured: {
          id: content.attachment.id,
          name: content.attachment.name,
          service: content.attachment.service,
          mimeType: content.mimeType,
          size: content.bytes.byteLength,
          kind: "image",
        },
      };
    }

    return {
      kind: "text" as const,
      markdown: presentAttachmentText(content),
      structured: {
        id: content.attachment.id,
        name: content.attachment.name,
        service: content.attachment.service,
        mimeType: content.mimeType,
        size: content.attachment.size,
        kind: content.kind,
        url: content.attachment.url,
        truncated: content.truncated ?? false,
        note: content.note ?? null,
      },
    };
  }
}
