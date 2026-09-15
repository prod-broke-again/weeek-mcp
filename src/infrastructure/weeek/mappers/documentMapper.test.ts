import { describe, expect, it } from "vitest";
import { mapProjectDocumentsResponse, mapWeeekDocument } from "./documentMapper.js";

describe("documentMapper", () => {
  it("maps individual Weeek document DTO into WeeekDocument entity", () => {
    const dto = {
      id: 101,
      projectId: 2,
      name: "Техническое задание",
      lastUpdatedAt: "2026-09-15T12:00:00Z",
      ownerId: "9fc86b36-302f-4170-9ea1-b6c426b09f43",
      content: {
        data: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "Введение" }],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Это важный документ с " },
                { type: "text", text: "жирным текстом", marks: [{ type: "bold" }] },
                { type: "text", text: "." },
              ],
            },
          ],
        },
      },
    };

    const doc = mapWeeekDocument(dto);
    expect(doc.id).toBe(101);
    expect(doc.projectId).toBe(2);
    expect(doc.name).toBe("Техническое задание");
    expect(doc.lastUpdatedAt).toBe("2026-09-15T12:00:00Z");
    expect(doc.ownerId).toBe("9fc86b36-302f-4170-9ea1-b6c426b09f43");
    expect(doc.markdown).toContain("# Введение");
    expect(doc.markdown).toContain("**жирным текстом**");
  });

  it("maps API envelope with response.sections.document.documents", () => {
    const envelope = {
      success: true,
      sections: {
        document: {
          documents: [
            {
              id: 1,
              projectId: 2,
              name: "Doc 1",
              content: {
                data: {
                  type: "doc",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "First doc content" }],
                    },
                  ],
                },
              },
            },
            {
              id: 2,
              projectId: 2,
              name: "Doc 2",
              content: null,
            },
          ],
        },
      },
    };

    const result = mapProjectDocumentsResponse(2, envelope);
    expect(result.projectId).toBe(2);
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0]?.id).toBe(1);
    expect(result.documents[0]?.markdown).toBe("First doc content");
    expect(result.documents[1]?.id).toBe(2);
    expect(result.documents[1]?.markdown).toBe("");
  });
});
