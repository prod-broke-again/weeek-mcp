import type {
  Attachment,
  AttachmentContent,
  AttachmentContentKind,
} from "../../domain/attachment/entities.js";

const IMAGE_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
};

const TEXT_EXT: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  json: "application/json",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  xml: "application/xml",
  yaml: "text/yaml",
  yml: "text/yaml",
  log: "text/plain",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  ts: "text/typescript",
};

const MAX_TEXT_CHARS = 100_000;

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function guessMime(name: string, contentType: string | null): string {
  if (contentType) {
    const base = contentType.split(";")[0]?.trim().toLowerCase();
    if (base && base !== "application/octet-stream") return base;
  }
  const ext = extOf(name);
  return IMAGE_EXT[ext] ?? TEXT_EXT[ext] ?? "application/octet-stream";
}

export function classifyMime(mime: string, name: string): AttachmentContentKind {
  if (mime.startsWith("image/")) return "image";
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript"
  ) {
    return "text";
  }
  const ext = extOf(name);
  if (ext in TEXT_EXT) return "text";
  if (ext in IMAGE_EXT) return "image";
  return "unsupported";
}

export function decodeAttachmentContent(
  attachment: Attachment,
  bytes: Uint8Array,
  contentType: string | null,
): AttachmentContent {
  const mimeType = guessMime(attachment.name, contentType);
  const kind = classifyMime(mimeType, attachment.name);

  if (attachment.service !== "weeek") {
    return {
      attachment,
      kind: "link",
      mimeType,
      note: `External attachment from ${attachment.service}. Cannot download with Weeek token — open the URL (TTL ~1 hour if service=weeek).`,
    };
  }

  if (kind === "image") {
    return { attachment, kind: "image", mimeType, bytes };
  }

  if (kind === "text") {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const truncated = text.length > MAX_TEXT_CHARS;
    return {
      attachment,
      kind: "text",
      mimeType,
      text: truncated ? text.slice(0, MAX_TEXT_CHARS) : text,
      truncated,
      note: truncated
        ? `Text truncated to ${MAX_TEXT_CHARS} characters.`
        : undefined,
    };
  }

  const ext = extOf(attachment.name);
  if (ext === "pdf" || ext === "docx" || ext === "doc") {
    return {
      attachment,
      kind: "unsupported",
      mimeType,
      note: `PDF/DOCX text extraction is not enabled in v1. Use the attachment URL (valid ~1 hour for weeek service). Size: ${attachment.size ?? bytes.byteLength} bytes.`,
    };
  }

  return {
    attachment,
    kind: "unsupported",
    mimeType,
    note: `Unsupported content type "${mimeType}". Metadata + URL only (URL TTL ~1 hour for weeek).`,
  };
}
