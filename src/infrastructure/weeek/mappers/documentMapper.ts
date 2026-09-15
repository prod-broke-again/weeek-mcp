import type { WeeekDocument, ProjectDocumentsResult } from "../../../domain/document/entities.js";
import { proseMirrorToMarkdown } from "./proseMirror.js";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function mapWeeekDocument(dto: unknown): WeeekDocument {
  const r = asRecord(dto);
  const contentRoot = asRecord(r.content);
  const docAst = contentRoot.data ?? contentRoot;
  const markdown = proseMirrorToMarkdown(docAst);

  return {
    id: Number(r.id),
    projectId: Number(r.projectId),
    name: typeof r.name === "string" ? r.name : `Document #${r.id}`,
    lastUpdatedAt: typeof r.lastUpdatedAt === "string" ? r.lastUpdatedAt : null,
    ownerId: typeof r.ownerId === "string" ? r.ownerId : null,
    markdown,
    rawContent: r.content,
  };
}

export function mapProjectDocumentsResponse(
  projectId: number,
  envelope: unknown,
): ProjectDocumentsResult {
  const root = asRecord(envelope);
  const sections = asRecord(root.sections);
  const documentSection = asRecord(sections.document);

  let rawDocs: unknown[] = [];
  if (Array.isArray(documentSection.documents)) {
    rawDocs = documentSection.documents;
  } else if (Array.isArray(root.documents)) {
    rawDocs = root.documents;
  }

  const documents = rawDocs.map(mapWeeekDocument);
  return {
    projectId,
    documents,
  };
}
