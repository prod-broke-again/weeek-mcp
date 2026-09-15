import type { CommentImage } from "../../../domain/task/Comment.js";

export interface PmMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface PmNode {
  type?: string;
  text?: string;
  marks?: PmMark[];
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
  if (n.type === "hardBreak" || n.type === "hard_break" || n.type === "line-break" || n.type === "line_break") return "\n";
  if (!Array.isArray(n.content)) return "";
  return n.content.map(collectText).join("");
}

/**
 * Convert TipTap / ProseMirror AST (or content array) into readable Markdown.
 * Supports:
 * - heading (attrs.level 1..6 -> #, ##, ###...)
 * - paragraph
 * - text with marks (bold, italic, strike, code, link)
 * - image with attrs.link and content caption -> ![caption](link)
 * - line-break -> \n
 * - bulletList, orderedList, blockquote, codeBlock, horizontalRule
 */
export function proseMirrorToMarkdown(docOrNodes: unknown): string {
  const nodes = extractNodes(docOrNodes);
  if (nodes.length === 0) {
    return "";
  }

  const renderedBlocks: string[] = [];

  for (const node of nodes) {
    const block = renderBlock(node);
    if (block.trim()) {
      renderedBlocks.push(block.trimEnd());
    }
  }

  return renderedBlocks.join("\n\n").trim();
}

function extractNodes(input: unknown): PmNode[] {
  if (!input || typeof input !== "object") return [];
  if (Array.isArray(input)) return input as PmNode[];

  const r = input as Record<string, unknown>;
  // Handles document.content.data
  if (r.data && typeof r.data === "object") {
    return extractNodes(r.data);
  }
  // Handles { type: "doc", content: [...] }
  if (Array.isArray(r.content)) {
    return r.content as PmNode[];
  }
  return [r as PmNode];
}

function renderBlock(node: PmNode, listDepth = 0): string {
  const type = node.type ?? "";

  switch (type) {
    case "heading": {
      const rawLevel = Number(node.attrs?.level);
      const level = Math.min(Math.max(Number.isInteger(rawLevel) && rawLevel > 0 ? rawLevel : 1, 1), 6);
      const prefix = `${"#".repeat(level)} `;
      const inline = renderInlineList(node.content ?? []);
      return `${prefix}${inline.trim()}`;
    }

    case "paragraph": {
      return renderInlineList(node.content ?? []);
    }

    case "image": {
      return renderImage(node);
    }

    case "bulletList":
    case "bullet_list": {
      const items = node.content ?? [];
      return items
        .map((item) => renderListItem(item, "- ", listDepth))
        .filter(Boolean)
        .join("\n");
    }

    case "orderedList":
    case "ordered_list": {
      const items = node.content ?? [];
      const start = Number(node.attrs?.start) || 1;
      return items
        .map((item, idx) => renderListItem(item, `${start + idx}. `, listDepth))
        .filter(Boolean)
        .join("\n");
    }

    case "listItem":
    case "list_item": {
      return renderListItem(node, "- ", listDepth);
    }

    case "blockquote": {
      const innerBlocks = (node.content ?? []).map((c) => renderBlock(c, listDepth)).filter(Boolean);
      const text = innerBlocks.join("\n\n");
      return text
        .split("\n")
        .map((line) => (line ? `> ${line}` : ">"))
        .join("\n");
    }

    case "codeBlock":
    case "code_block": {
      const lang = String(node.attrs?.language ?? node.attrs?.lang ?? "");
      const code = collectText(node);
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }

    case "horizontalRule":
    case "horizontal_rule":
    case "rule": {
      return "---";
    }

    case "line-break":
    case "line_break":
    case "hardBreak":
    case "hard_break": {
      return "\n";
    }

    default: {
      if (Array.isArray(node.content)) {
        return renderInlineList(node.content);
      }
      if (typeof node.text === "string") {
        return applyMarks(node.text, node.marks);
      }
      return "";
    }
  }
}

function renderListItem(node: PmNode, prefix: string, listDepth: number): string {
  const indent = "  ".repeat(listDepth);
  const children = node.content ?? [];
  const parts: string[] = [];

  for (const child of children) {
    if (
      child.type === "bulletList" ||
      child.type === "bullet_list" ||
      child.type === "orderedList" ||
      child.type === "ordered_list"
    ) {
      parts.push(renderBlock(child, listDepth + 1));
    } else {
      const rendered = renderBlock(child, listDepth).trim();
      if (rendered) parts.push(rendered);
    }
  }

  if (parts.length === 0) return "";
  const first = `${indent}${prefix}${parts[0]}`;
  const rest = parts.slice(1).map((p) => `${indent}  ${p}`).join("\n");
  return rest ? `${first}\n${rest}` : first;
}

function renderInlineList(nodes: PmNode[]): string {
  return nodes.map(renderInlineNode).join("");
}

function renderInlineNode(node: PmNode): string {
  const type = node.type ?? "";

  switch (type) {
    case "text": {
      return applyMarks(node.text ?? "", node.marks);
    }

    case "line-break":
    case "line_break":
    case "hardBreak":
    case "hard_break": {
      return "\n";
    }

    case "image": {
      return renderImage(node);
    }

    default: {
      if (typeof node.text === "string") {
        return applyMarks(node.text, node.marks);
      }
      if (Array.isArray(node.content)) {
        return renderInlineList(node.content);
      }
      return "";
    }
  }
}

function renderImage(node: PmNode): string {
  const attrs = node.attrs ?? {};
  const link = String(attrs.link ?? attrs.src ?? attrs.url ?? "").trim();
  if (!link) return "";

  let caption = "";
  if (Array.isArray(node.content) && node.content.length > 0) {
    caption = collectText(node).trim();
  }
  if (!caption) {
    caption = String(attrs.caption ?? attrs.name ?? attrs.alt ?? "").trim();
  }

  return `![${caption}](${link})`;
}

function applyMarks(rawText: string, marks?: PmMark[]): string {
  if (!marks || marks.length === 0 || !rawText) {
    return rawText;
  }

  if (!rawText.trim()) {
    return rawText;
  }

  const leadingMatch = rawText.match(/^\s*/);
  const leading = leadingMatch ? leadingMatch[0] : "";
  const trailingMatch = rawText.match(/\s*$/);
  const trailing = trailingMatch ? trailingMatch[0] : "";
  let core = rawText.slice(leading.length, rawText.length - trailing.length);

  for (const mark of marks) {
    if (!mark || typeof mark !== "object") continue;
    const type = String(mark.type).toLowerCase();
    switch (type) {
      case "bold":
      case "strong":
        core = `**${core}**`;
        break;
      case "italic":
      case "em":
        core = `*${core}*`;
        break;
      case "strike":
      case "strikethrough":
      case "s":
        core = `~~${core}~~`;
        break;
      case "code":
        core = `\`${core}\``;
        break;
      case "link": {
        const href = String(mark.attrs?.href ?? mark.attrs?.link ?? mark.attrs?.url ?? "");
        if (href) {
          core = `[${core}](${href})`;
        }
        break;
      }
      case "underline":
      case "u":
        core = `<u>${core}</u>`;
        break;
    }
  }

  return `${leading}${core}${trailing}`;
}

