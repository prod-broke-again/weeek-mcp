import { describe, expect, it, vi } from "vitest";
import type { DirectoryRepository } from "../../domain/ports/DirectoryRepository.js";
import type { TaskRepository } from "../../domain/ports/TaskRepository.js";
import type { Task } from "../../domain/task/entities.js";
import { PendingWriteStore } from "../../infrastructure/write/PendingWriteStore.js";
import { ConfirmWrite } from "./ConfirmWrite.js";
import { ProposeUpdateTask } from "./ProposeUpdateTask.js";
import type { Config } from "../../infrastructure/config/Config.js";

const task: Task = {
  id: 42,
  parentId: null,
  title: "Existing task",
  description: "Before",
  type: "action",
  priority: null,
  isCompleted: false,
  isDeleted: false,
  isPrivate: false,
  authorId: "user-1",
  assignees: [],
  subscribers: [],
  tags: [],
  subTaskIds: [],
  locations: [{ projectId: 2, boardId: 3, boardColumnId: 8 }],
  startDate: null,
  dueDate: null,
  startDateTime: null,
  dueDateTime: null,
  createdAt: "",
  updatedAt: "",
  completedAt: null,
  durationMinutes: null,
  overdue: 0,
  attachments: [],
  timeEntries: [],
  customFields: [],
};

function taskRepository(): TaskRepository {
  return {
    find: vi.fn(async () => ({ items: [], hasMore: false, offset: 0, perPage: 50 })),
    byId: vi.fn(async () => task),
    tree: vi.fn(async () => ({ task, children: [] })),
    create: vi.fn(async () => task),
    update: vi.fn(async (_id, input) => ({
      ...task,
      title: input.title ?? task.title,
    })),
    delete: vi.fn(async () => undefined),
    setBoard: vi.fn(async () => undefined),
    setBoardColumn: vi.fn(async () => undefined),
    addLocation: vi.fn(async () => undefined),
  };
}

const directory = {
  workspace: vi.fn(async () => ({
    id: 846240,
    title: "Workspace",
    description: null,
    isPersonal: false,
    logo: null,
  })),
} as unknown as DirectoryRepository;

const config = { readOnlyProjects: [], writeProjects: [] } as unknown as Config;

describe("guarded write flow", () => {
  it("proposal only reads and does not mutate", async () => {
    const tasks = taskRepository();
    const pending = new PendingWriteStore();
    const result = await new ProposeUpdateTask(tasks, config, pending).execute({
      taskId: 42,
      title: "New title",
    });

    expect(tasks.byId).toHaveBeenCalledWith(42);
    expect(tasks.update).not.toHaveBeenCalled();
    expect(result.structured.confirmationToken).toEqual(expect.any(String));
    expect(result.markdown).toContain("No change has been made");
  });

  it("blocks writes outside the read project whitelist", async () => {
    const tasks = taskRepository();
    const pending = new PendingWriteStore();
    const blockedConfig = { readOnlyProjects: [99], writeProjects: [] } as unknown as Config;

    await expect(
      new ProposeUpdateTask(tasks, blockedConfig, pending).execute({
        taskId: 42,
        title: "New title",
      }),
    ).rejects.toThrow(/outside WEEEK_READ_ONLY_PROJECTS/);
    expect(tasks.update).not.toHaveBeenCalled();
  });

  it("blocks writes outside the write project whitelist", async () => {
    const tasks = taskRepository();
    const pending = new PendingWriteStore();
    const blockedConfig = {
      readOnlyProjects: [2, 5],
      writeProjects: [5],
    } as unknown as Config;

    await expect(
      new ProposeUpdateTask(tasks, blockedConfig, pending).execute({
        taskId: 42,
        title: "New title",
      }),
    ).rejects.toThrow(/outside WEEEK_WRITE_PROJECTS/);
    expect(tasks.update).not.toHaveBeenCalled();
  });

  it("confirmation mutates exactly once", async () => {
    const tasks = taskRepository();
    const pending = new PendingWriteStore();
    const proposal = await new ProposeUpdateTask(tasks, config, pending).execute({
      taskId: 42,
      title: "New title",
    });
    const confirm = new ConfirmWrite(tasks, directory, pending);

    const result = await confirm.execute({
      confirmationToken: proposal.structured.confirmationToken,
    });

    expect(tasks.update).toHaveBeenCalledOnce();
    expect(tasks.update).toHaveBeenCalledWith(42, { title: "New title" });
    expect(result.structured.status).toBe("updated");
    await expect(
      confirm.execute({ confirmationToken: proposal.structured.confirmationToken }),
    ).rejects.toThrow(/already used/i);
    expect(tasks.update).toHaveBeenCalledOnce();
  });
});
