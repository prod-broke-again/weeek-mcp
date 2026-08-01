import type { CommentImage } from "../../../domain/task/Comment.js";

interface PmNode {
  type?: string;
  text?: string;
  content?: PmNode[];
  attrs?: Record<string, unknown>;
}

export interface ProseMirrorExtract {
  text: string;
  images: CommentImage[];
}

/** Flatten TipTap / ProseMirror doc into plain text + image refs. */
export function proseMirrorToText(doc: unknown): ProseMirrorExtract {
  const images: CommentImage[] = [];
  const lines: string[] = [];

  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const n = node as PmNode;

    if (n.type === "text" && typeof n.text === "string") {
      return;
    }

    if (n.type === "image") {
      const attrs = n.attrs ?? {};
      const id = String(attrs.id ?? "");
      const name = String(attrs.name ?? "image");
      const url = String(attrs.link ?? attrs.src ?? "");
      const size = typeof attrs.size === "number" ? attrs.size : null;
      if (id || url) {
        images.push({ id: id || url, name, url, size });
      }
      return;
    }

    if (n.type === "paragraph" || n.type === "heading") {
      const text = collectText(n).trim();
      if (text) lines.push(text);
      // images nested inside paragraph
      for (const c of n.content ?? []) {
        if ((c as PmNode).type === "image") walk(c);
      }
      return;
    }

    for (const c of n.content ?? []) walk(c);
  };

  walk(doc);

  if (lines.length === 0) {
    const flat = collectText(doc).trim();
    if (flat) lines.push(flat);
  }

  return { text: lines.join("\n\n"), images };
}

function collectText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as PmNode;
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (n.type === "hardBreak" || n.type === "hard_break") return "\n";
  if (!Array.isArray(n.content)) return "";
  return n.content.map(collectText).join("");
}
