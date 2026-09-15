import type { WeeekDocument, ProjectDocumentsResult } from "../../domain/document/entities.js";
import { wrapUntrusted } from "./untrusted.js";

export function presentDocuments(result: ProjectDocumentsResult): string {
  if (result.documents.length === 0) {
    return `No documents found in project #${result.projectId}.`;
  }

  const blocks = result.documents.map((d) => presentOneDocument(d));
  return [
    `# Documents in project #${result.projectId} (${result.documents.length})`,
    "",
    ...blocks,
  ].join("\n");
}

export function presentOneDocument(d: WeeekDocument): string {
  const updated = d.lastUpdatedAt || "—";
  const author = d.ownerId ? ` · Owner: ${d.ownerId}` : "";
  const header = `## [Doc #${d.id}] ${d.name} (Updated: ${updated}${author})`;

  if (!d.markdown.trim()) {
    return `${header}\n\n*(Empty document)*\n`;
  }

  return [
    header,
    "",
    wrapUntrusted(`document-${d.id}`, d.markdown),
    "",
  ].join("\n");
}

export function documentsToStructured(result: ProjectDocumentsResult): Record<string, unknown> {
  return {
    projectId: result.projectId,
    totalCount: result.documents.length,
    documents: result.documents.map((d) => ({
      id: d.id,
      projectId: d.projectId,
      name: d.name,
      lastUpdatedAt: d.lastUpdatedAt,
      ownerId: d.ownerId,
      markdown: d.markdown,
    })),
  };
}
