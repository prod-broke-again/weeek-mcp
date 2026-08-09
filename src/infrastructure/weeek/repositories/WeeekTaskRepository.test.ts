import { describe, expect, it, vi } from "vitest";
import type { WeeekHttpClient } from "../WeeekHttpClient.js";
import { WeeekTaskRepository } from "./WeeekTaskRepository.js";

const taskDto = {
  id: 42,
  title: "Task",
  type: "action",
  priority: null,
  isCompleted: false,
  isDeleted: false,
  isPrivate: false,
  authorId: "u1",
  assignees: [],
  subscribers: [],
  tags: [],
  subTasks: [],
  locations: [],
  attachments: [],
  timeEntries: [],
  customFields: [],
};

describe("WeeekTaskRepository writes", () => {
  it("uses the documented task mutation endpoints", async () => {
    const request = vi.fn(async (_path: string, options?: { envelopeKey?: string }) =>
      options?.envelopeKey ? taskDto : undefined,
    );
    const repository = new WeeekTaskRepository({ request } as unknown as WeeekHttpClient);

    await repository.create({
      title: "Task",
      locations: [{ projectId: 2, boardColumnId: 8 }],
    });
    await repository.update(42, { title: "Renamed" });
    await repository.setBoard(42, 3);
    await repository.setBoardColumn(42, 8);
    await repository.addLocation(42, { projectId: 2, boardColumnId: 8 });
    await repository.delete(42);

    expect(request).toHaveBeenNthCalledWith(
      1,
      "/tm/tasks",
      expect.objectContaining({ method: "POST", noRetry: true }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/tm/tasks/42",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      "/tm/tasks/42/board",
      expect.objectContaining({ method: "POST", body: { boardId: 3 } }),
    );
    expect(request).toHaveBeenNthCalledWith(
      4,
      "/tm/tasks/42/board-column",
      expect.objectContaining({ method: "POST", body: { boardColumnId: 8 } }),
    );
    expect(request).toHaveBeenNthCalledWith(
      5,
      "/tm/tasks/42/locations",
      expect.objectContaining({ method: "POST" }),
    );
    expect(request).toHaveBeenNthCalledWith(
      6,
      "/tm/tasks/42",
      expect.objectContaining({ method: "DELETE", noRetry: true }),
    );
  });
});
