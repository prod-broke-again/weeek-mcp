import type { AttachmentId, UserId } from "../shared/types.js";

export type AttachmentService =
  | "weeek"
  | "google_drive"
  | "dropbox"
  | "one_drive"
  | "box";

export interface Attachment {
  id: AttachmentId;
  creatorId: UserId;
  service: AttachmentService;
  name: string;
  url: string;
  size: number | null;
  createdAt: string;
}

export type AttachmentContentKind = "image" | "text" | "link" | "unsupported";

export interface AttachmentContent {
  attachment: Attachment;
  kind: AttachmentContentKind;
  mimeType: string;
  /** Present for text kinds */
  text?: string;
  truncated?: boolean;
  /** Present for image kinds (raw bytes) */
  bytes?: Uint8Array;
  /** Human note (external link, pdf, etc.) */
  note?: string;
}
