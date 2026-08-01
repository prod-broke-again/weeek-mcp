import { describe, expect, it } from "vitest";
import { classifyMime, decodeAttachmentContent, guessMime } from "./ContentDecoder.js";
import type { Attachment } from "../../domain/attachment/entities.js";

const base: Attachment = {
  id: "a1",
  creatorId: "u1",
  service: "weeek",
  name: "notes.md",
  url: "https://example.com/f",
  size: 10,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("ContentDecoder", () => {
  it("guesses mime from extension", () => {
    expect(guessMime("x.png", null)).toBe("image/png");
    expect(guessMime("x.md", null)).toBe("text/markdown");
  });

  it("decodes text", () => {
    const bytes = new TextEncoder().encode("# hi");
    const content = decodeAttachmentContent(base, bytes, "text/markdown");
    expect(content.kind).toBe("text");
    expect(content.text).toBe("# hi");
  });

  it("keeps images as bytes", () => {
    const att = { ...base, name: "shot.png" };
    const bytes = new Uint8Array([1, 2, 3]);
    const content = decodeAttachmentContent(att, bytes, "image/png");
    expect(content.kind).toBe("image");
    expect(content.bytes?.byteLength).toBe(3);
  });

  it("links external services", () => {
    const att = { ...base, service: "google_drive" as const };
    const content = decodeAttachmentContent(att, new Uint8Array(), null);
    expect(content.kind).toBe("link");
  });

  it("classifies pdf as unsupported in v1", () => {
    expect(classifyMime("application/pdf", "a.pdf")).toBe("unsupported");
  });
});
