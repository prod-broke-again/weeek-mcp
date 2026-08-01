import { afterEach, describe, expect, it } from "vitest";
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from "undici";
import { WeeekHttpClient } from "./WeeekHttpClient.js";
import type { Config } from "../config/Config.js";
import { HttpError } from "../../domain/shared/errors.js";
import type { Logger } from "../../domain/ports/Logger.js";

const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
};

function testConfig(over: Partial<Config> = {}): Config {
  return {
    apiToken: "test-token",
    baseUrl: "https://api.weeek.net/public/v1",
    appBaseUrl: "https://api.weeek.net",
    projectAliases: {},
    readOnlyProjects: [],
    allowWrite: false,
    maxAttachmentBytes: 8_388_608,
    cacheTtlSeconds: 300,
    rps: 100,
    logLevel: "silent",
    requestTimeoutMs: 5000,
    downloadTimeoutMs: 5000,
    maxRetries: 3,
    sessionFilePath: "/tmp/weeek-session.json",
    ...over,
  };
}

describe("WeeekHttpClient", () => {
  let agent: MockAgent;
  let previous: Dispatcher;

  afterEach(async () => {
    await agent?.close();
    setGlobalDispatcher(previous);
  });

  function setup() {
    previous = getGlobalDispatcher();
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
    const pool = agent.get("https://api.weeek.net");
    const client = new WeeekHttpClient(testConfig(), silentLogger);
    return { pool, client };
  }

  it("unwraps envelope key on 200", async () => {
    const { pool, client } = setup();
    pool
      .intercept({ path: "/public/v1/tm/tasks/1", method: "GET" })
      .reply(200, { success: true, task: { id: 1, title: "Hello" } });

    const task = await client.request<{ id: number; title: string }>("/tm/tasks/1", {
      envelopeKey: "task",
    });
    expect(task).toEqual({ id: 1, title: "Hello" });
  });

  it("maps 401 to UNAUTHORIZED", async () => {
    const { pool, client } = setup();
    pool
      .intercept({ path: "/public/v1/user/me", method: "GET" })
      .reply(401, { message: "Unauthorized" });

    await expect(client.request("/user/me", { envelopeKey: "user" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("maps 404", async () => {
    const { pool, client } = setup();
    pool
      .intercept({ path: "/public/v1/tm/tasks/999", method: "GET" })
      .reply(404, { message: "Not found" });

    await expect(
      client.request("/tm/tasks/999", { envelopeKey: "task", noRetry: true }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it("retries on 429 respecting Retry-After", async () => {
    const { pool, client } = setup();
    pool
      .intercept({ path: "/public/v1/tm/projects", method: "GET" })
      .reply(429, { message: "slow down" }, { headers: { "retry-after": "0" } });
    pool
      .intercept({ path: "/public/v1/tm/projects", method: "GET" })
      .reply(200, { success: true, projects: [{ id: 1 }] });

    const projects = await client.request<unknown[]>("/tm/projects", {
      envelopeKey: "projects",
    });
    expect(projects).toEqual([{ id: 1 }]);
  });

  it("retries 5xx then succeeds", async () => {
    const { pool, client } = setup();
    pool.intercept({ path: "/public/v1/ws", method: "GET" }).reply(503, { message: "down" });
    pool
      .intercept({ path: "/public/v1/ws", method: "GET" })
      .reply(200, { success: true, workspace: { id: 2, title: "WS" } });

    const ws = await client.request<{ id: number }>("/ws", { envelopeKey: "workspace" });
    expect(ws.id).toBe(2);
  });

  it("serializes boolean query as 0/1", async () => {
    const { pool, client } = setup();
    pool
      .intercept({
        path: "/public/v1/tm/tasks?completed=1&projectId=4",
        method: "GET",
      })
      .reply(200, { success: true, tasks: [], hasMore: false });

    await client.request("/tm/tasks", {
      query: { completed: true, projectId: 4 },
      raw: true,
    });
  });
});
