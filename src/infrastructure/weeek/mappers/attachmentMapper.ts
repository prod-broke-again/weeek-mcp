import type { Attachment, AttachmentService } from "../../../domain/attachment/entities.js";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

const SERVICES = new Set([
  "weeek",
  "google_drive",
  "dropbox",
  "one_drive",
  "box",
]);

export function mapAttachment(dto: unknown): Attachment {
  const r = asRecord(dto);
  const service = String(r.service ?? "weeek");
  return {
    id: String(r.id ?? ""),
    creatorId: String(r.creatorId ?? ""),
    service: (SERVICES.has(service) ? service : "weeek") as AttachmentService,
    name: String(r.name ?? ""),
    url: String(r.url ?? ""),
    size: typeof r.size === "number" ? r.size : null,
    createdAt: String(r.createdAt ?? ""),
  };
}
