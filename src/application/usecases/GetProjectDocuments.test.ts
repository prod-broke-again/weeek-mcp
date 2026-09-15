import { describe, expect, it, vi } from "vitest";
import { GetProjectDocuments } from "./GetProjectDocuments.js";
import type { SessionDocumentRepository } from "../../domain/ports/SessionDocumentRepository.js";
import type { SessionCommentRepository } from "../../domain/ports/SessionCommentRepository.js";
import type { SessionStore } from "../../infrastructure/session/SessionStore.js";
import { DomainError } from "../../domain/shared/errors.js";

describe("GetProjectDocuments", () => {
  it("throws UNAUTHORIZED when session probe fails", async () => {
    const docsRepo = {} as SessionDocumentRepository;
    const probeRepo = {
      probe: vi.fn().mockResolvedValue({ ok: false, reason: "no_session" }),
    } as unknown as SessionCommentRepository;
    const store = {
      filePath: "/test/session.json",
    } as unknown as SessionStore;

    const usecase = new GetProjectDocuments(docsRepo, probeRepo, store);

    await expect(usecase.execute({ projectId: 2 })).rejects.toBeInstanceOf(DomainError);
  });

  it("returns formatted markdown and structured output when session is valid", async () => {
    const docsRepo = {
      getProjectDocuments: vi.fn().mockResolvedValue({
        projectId: 2,
        documents: [
          {
            id: 10,
            projectId: 2,
            name: "Спецификация API",
            lastUpdatedAt: "2026-09-15T12:00:00Z",
            ownerId: "user-uuid",
            markdown: "# Спецификация\n\nТекст спецификации",
          },
        ],
      }),
    } as unknown as SessionDocumentRepository;

    const probeRepo = {
      probe: vi.fn().mockResolvedValue({ ok: true, workspaceId: 846240 }),
    } as unknown as SessionCommentRepository;

    const store = {
      filePath: "/test/session.json",
    } as unknown as SessionStore;

    const usecase = new GetProjectDocuments(docsRepo, probeRepo, store);
    const result = await usecase.execute({ projectId: 2 });

    expect(result.markdown).toContain("Documents in project #2");
    expect(result.markdown).toContain("Спецификация API");
    expect(result.markdown).toContain("Текст спецификации");
    expect(result.structured).toEqual({
      projectId: 2,
      totalCount: 1,
      documents: [
        {
          id: 10,
          projectId: 2,
          name: "Спецификация API",
          lastUpdatedAt: "2026-09-15T12:00:00Z",
          ownerId: "user-uuid",
          markdown: "# Спецификация\n\nТекст спецификации",
        },
      ],
    });
  });
});
