import type { Attachment, AttachmentContent } from "../attachment/entities.js";
import type { AttachmentId } from "../shared/types.js";

export interface AttachmentRepository {
  metadata(fileId: AttachmentId): Promise<Attachment>;
  download(fileId: AttachmentId): Promise<AttachmentContent>;
}
