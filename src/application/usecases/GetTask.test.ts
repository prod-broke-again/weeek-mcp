import { describe, expect, it } from "vitest";
import { GetTask } from "./GetTask.js";
import type { TaskRepository } from "../../domain/ports/TaskRepository.js";
import type { SessionCommentRepository } from "../../domain/ports/SessionCommentRepository.js";
import type { NameResolver } from "../enrichment/NameResolver.js";
import type { Task } from "../../domain/task/entities.js";
import type { Logger } from "../../domain/ports/Logger.js";

const sampleTask: Task = {
  id: 253,
  parentId: null,
  title: "Test",
  description: null,
  type: "action",
  priority: null,
  isCompleted: false,
  isDeleted: false,
  isPrivate: false,
  authorId: "u1",
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

const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
};

const names = {
  resolveUsers: async () => ({}),
  resolveTags: async () => ({}),
  resolveProjects: async () => ({ 2: "АЧПП" }),
  resolveBoards: async () => ({ 3: "Сайт" }),
  resolveColumns: async () => ({ 8: "В работе" }),
} as unknown as NameResolver;

describe("GetTask comments enrichment", () => {
  it("notes missing session without failing", async () => {
    const tasks: TaskRepository = {
      find: async () => ({ items: [], hasMore: false, offset: 0, perPage: 30 }),
      byId: async () => sampleTask,
      tree: async () => ({ task: sampleTask, children: [] }),
    };
    const comments: SessionCommentRepository = {
      hasSessionConfigured: async () => false,
      probe: async () => ({ ok: false, reason: "no_session" }),
      getTaskComments: async () => {
        throw new Error("should not call");
      },
    };

    const result = await new GetTask(tasks, names, comments, silentLogger).execute({ taskId: 253 });
    expect(result.markdown).toContain("Comments unavailable");
    expect(result.structured.sessionComments).toBe("missing");
  });

  it("appends comments when session ready", async () => {
    const tasks: TaskRepository = {
      find: async () => ({ items: [], hasMore: false, offset: 0, perPage: 30 }),
      byId: async () => sampleTask,
      tree: async () => ({ task: sampleTask, children: [] }),
    };
    const comments: SessionCommentRepository = {
      hasSessionConfigured: async () => true,
      probe: async () => ({ ok: true, workspaceId: 846240 }),
      getTaskComments: async () => ({
        taskId: 253,
        commentsCount: 1,
        comments: [
          {
            id: 129,
            parentId: null,
            authorId: "u",
            authorName: "Olga Bajwa",
            authorEmail: "bajwa@yandex.ru",
            sentAt: "2026-07-29T10:58:20Z",
            text: "рассинхрон статусов",
            images: [],
            isUpdated: false,
          },
        ],
      }),
    };

    const result = await new GetTask(tasks, names, comments, silentLogger).execute({ taskId: 253 });
    expect(result.markdown).toContain("Olga Bajwa");
    expect(result.markdown).toContain("рассинхрон статусов");
    expect(result.structured.sessionComments).toBe("ready");
  });
});
