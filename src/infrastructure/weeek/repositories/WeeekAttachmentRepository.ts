import type { AttachmentRepository } from "../../../domain/ports/AttachmentRepository.js";
import type { Attachment, AttachmentContent } from "../../../domain/attachment/entities.js";
import type { AttachmentId } from "../../../domain/shared/types.js";
import { DomainError } from "../../../domain/shared/errors.js";
import type { WeeekHttpClient } from "../WeeekHttpClient.js";
import { mapAttachment } from "../mappers/attachmentMapper.js";
import { attachmentById } from "../endpoints/attachments.js";
import { SizeGuard } from "../../files/SizeGuard.js";
import { decodeAttachmentContent } from "../../files/ContentDecoder.js";

export class WeeekAttachmentRepository implements AttachmentRepository {
  constructor(
    private readonly http: WeeekHttpClient,
    private readonly sizeGuard: SizeGuard,
  ) {}

  async metadata(fileId: AttachmentId): Promise<Attachment> {
    const ep = attachmentById(fileId);
    const dto = await this.http.request<unknown>(ep.path, { envelopeKey: ep.envelopeKey });
    return mapAttachment(dto);
  }

  async download(fileId: AttachmentId): Promise<AttachmentContent> {
    // Always re-fetch metadata — URL TTL is 1 hour and must not be cached.
    const attachment = await this.metadata(fileId);

    if (attachment.service !== "weeek") {
      return {
        attachment,
        kind: "link",
        mimeType: "application/octet-stream",
        note: `External attachment (${attachment.service}). Open URL directly; cannot download with Weeek API token.`,
      };
    }

    if (attachment.size !== null) {
      this.sizeGuard.assertWithinLimit(attachment.size, attachment.name);
    }

    if (!attachment.url) {
      throw new DomainError("UPSTREAM", `Attachment ${fileId} has empty URL`);
    }

    const { bytes, contentType } = await this.http.download(attachment.url);
    this.sizeGuard.assertWithinLimit(bytes.byteLength, attachment.name);
    return decodeAttachmentContent(attachment, bytes, contentType);
  }
}
