import { afterEach, describe, expect, it } from "vitest";
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from "undici";
import { WeeekSessionClient } from "./WeeekSessionClient.js";
import type { Config } from "../config/Config.js";
import type { Logger } from "../../domain/ports/Logger.js";
import { HttpError } from "../../domain/shared/errors.js";

const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
};

const config: Config = {
  apiToken: "public",
  baseUrl: "https://api.weeek.net/public/v1",
  appBaseUrl: "https://api.weeek.net",
  projectAliases: {},
  readOnlyProjects: [],
  writeProjects: [],
  pendingWritesDir: '/tmp/weeek-pending',
  allowWrite: false,
  maxAttachmentBytes: 1,
  cacheTtlSeconds: 1,
  rps: 100,
  logLevel: "silent",
  requestTimeoutMs: 5000,
  downloadTimeoutMs: 5000,
  maxRetries: 1,
  sessionFilePath: "/tmp/x",
};

describe("WeeekSessionClient", () => {
  let agent: MockAgent;
  let previous: Dispatcher;

  afterEach(async () => {
    await agent?.close();
    setGlobalDispatcher(previous);
  });

  it("returns JSON on 200 with cookie auth", async () => {
    previous = getGlobalDispatcher();
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
    const pool = agent.get("https://api.weeek.net");
    pool
      .intercept({ path: "/ws/846240/tm/tasks/253?withSubtasks=1", method: "GET" })
      .reply(200, { success: true, task: { id: 253, comments: [] } });

    const client = new WeeekSessionClient(config, silentLogger);
    const body = await client.getJson("/ws/846240/tm/tasks/253", {
      workspaceId: 846240,
      cookie: "weeek_session=abc",
    }, { query: { withSubtasks: 1 } });
    expect((body as { task: { id: number } }).task.id).toBe(253);
  });

  it("maps unauthenticated to 401 HttpError", async () => {
    previous = getGlobalDispatcher();
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
    const pool = agent.get("https://api.weeek.net");
    pool
      .intercept({ path: "/ws/846240/tm/tasks/1?withSubtasks=1", method: "GET" })
      .reply(200, { success: false, code: 2000000, message: "Unauthenticated." });

    const client = new WeeekSessionClient(config, silentLogger);
    await expect(
      client.getJson("/ws/846240/tm/tasks/1", { workspaceId: 846240, cookie: "bad" }, {
        query: { withSubtasks: 1 },
      }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it("fetches project documents with getProjectDocuments", async () => {
    previous = getGlobalDispatcher();
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
    const pool = agent.get("https://api.weeek.net");
    pool
      .intercept({ path: "/ws/846240/tm/projects/2/documents", method: "GET" })
      .reply(200, {
        success: true,
        sections: {
          document: {
            documents: [{ id: 10, projectId: 2, name: "Doc 10" }],
          },
        },
      });

    const client = new WeeekSessionClient(config, silentLogger);
    const result = await client.getProjectDocuments<{
      sections: { document: { documents: Array<{ id: number }> } };
    }>(846240, 2, {
      workspaceId: 846240,
      cookie: "weeek_session=abc",
    });

    expect(result.sections.document.documents[0]?.id).toBe(10);
  });

  it("standalone fetchProjectDocuments executes GET and returns documents", async () => {
    previous = getGlobalDispatcher();
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
    const pool = agent.get("https://api.weeek.net");
    pool
      .intercept({ path: "/ws/846240/tm/projects/2/documents", method: "GET" })
      .reply(200, {
        success: true,
        sections: {
          document: {
            documents: [{ id: 42, projectId: 2, name: "Test Doc" }],
          },
        },
      });

    const { fetchProjectDocuments } = await import("./WeeekSessionClient.js");
    const result = await fetchProjectDocuments<{
      sections: { document: { documents: Array<{ id: number }> } };
    }>({
      workspaceId: 846240,
      projectId: 2,
      cookie: "weeek_session=abc; remember_app_x=123",
    });

    expect(result.sections.document.documents[0]?.id).toBe(42);
  });
});

