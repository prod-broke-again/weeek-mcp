import { describe, expect, it, vi } from "vitest";
import { WeeekSessionDocumentRepository } from "./WeeekSessionDocumentRepository.js";
import type { SessionStore } from "../../session/SessionStore.js";
import type { WeeekSessionClient } from "../WeeekSessionClient.js";
import type { Logger } from "../../../domain/ports/Logger.js";
import { DomainError } from "../../../domain/shared/errors.js";

const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
};

describe("WeeekSessionDocumentRepository", () => {
  it("throws UNAUTHORIZED if session is not configured", async () => {
    const store = {
      load: vi.fn().mockResolvedValue(null),
      invalidateCache: vi.fn(),
    } as unknown as SessionStore;

    const client = {} as WeeekSessionClient;
    const repo = new WeeekSessionDocumentRepository(store, client, silentLogger);

    await expect(repo.getProjectDocuments(2)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("fetches and maps project documents successfully", async () => {
    const store = {
      load: vi.fn().mockResolvedValue({
        workspaceId: 846240,
        cookie: "weeek_session=abc",
      }),
      invalidateCache: vi.fn(),
    } as unknown as SessionStore;

    const client = {
      getProjectDocuments: vi.fn().mockResolvedValue({
        success: true,
        sections: {
          document: {
            documents: [
              {
                id: 1,
                projectId: 2,
                name: "Архитектура",
                lastUpdatedAt: "2026-09-15T10:00:00Z",
                ownerId: "user-uuid-1",
                content: {
                  data: {
                    type: "doc",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Описание архитектуры" }],
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      }),
    } as unknown as WeeekSessionClient;

    const repo = new WeeekSessionDocumentRepository(store, client, silentLogger);
    const result = await repo.getProjectDocuments(2);

    expect(result.projectId).toBe(2);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.name).toBe("Архитектура");
    expect(result.documents[0]?.markdown).toBe("Описание архитектуры");
  });

  it("invalidates session cache on UNAUTHORIZED error", async () => {
    const invalidateCache = vi.fn();
    const store = {
      load: vi.fn().mockResolvedValue({
        workspaceId: 846240,
        cookie: "bad_cookie",
      }),
      invalidateCache,
    } as unknown as SessionStore;

    const client = {
      getProjectDocuments: vi.fn().mockRejectedValue(new DomainError("UNAUTHORIZED", "expired")),
    } as unknown as WeeekSessionClient;

    const repo = new WeeekSessionDocumentRepository(store, client, silentLogger);
    await expect(repo.getProjectDocuments(2)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    expect(invalidateCache).toHaveBeenCalledOnce();
  });
});
