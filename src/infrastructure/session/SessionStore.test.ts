import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SessionStore, normalizeCookieHeader } from "./SessionStore.js";
import type { Config } from "../config/Config.js";

function cfg(sessionFilePath: string, over: Partial<Config> = {}): Config {
  return {
    apiToken: "t",
    baseUrl: "https://api.weeek.net/public/v1",
    appBaseUrl: "https://api.weeek.net",
    projectAliases: {},
    readOnlyProjects: [],
  writeProjects: [],
  pendingWritesDir: '/tmp/weeek-pending',
    allowWrite: false,
    maxAttachmentBytes: 1,
    cacheTtlSeconds: 1,
    rps: 4,
    logLevel: "silent",
    requestTimeoutMs: 1000,
    downloadTimeoutMs: 1000,
    maxRetries: 1,
    sessionFilePath,
    ...over,
  };
}

describe("normalizeCookieHeader", () => {
  it("keeps auth cookies only", () => {
    const raw =
      "_ym_uid=1; weeek_session=abc; workspace_id=846240; carrotquest_uid=x; remember_app_59ba=xyz";
    const out = normalizeCookieHeader(raw);
    expect(out).toContain("weeek_session=abc");
    expect(out).toContain("remember_app_59ba=xyz");
    expect(out).not.toContain("carrotquest");
    expect(out).not.toContain("_ym_uid");
  });
});

describe("SessionStore", () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  });

  it("roundtrips file save/load", async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "weeek-sess-"));
    const file = path.join(dir, "session.json");
    const store = new SessionStore(cfg(file));
    await store.save({
      workspaceId: 846240,
      cookie: "weeek_session=secret; workspace_id=846240",
    });
    const loaded = await store.load();
    expect(loaded?.workspaceId).toBe(846240);
    expect(loaded?.cookie).toContain("weeek_session=secret");

    const onDisk = JSON.parse(await fs.readFile(file, "utf8"));
    expect(onDisk.workspaceId).toBe(846240);
  });

  it("parses import JSON payload", async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "weeek-sess-"));
    const store = new SessionStore(cfg(path.join(dir, "s.json")));
    const data = store.parseImportPayload(
      JSON.stringify({ workspaceId: 1, cookie: "weeek_session=x; _ym_uid=noise" }),
    );
    expect(data.workspaceId).toBe(1);
    expect(data.cookie).toBe("weeek_session=x");
  });

  it("uses env cookie override", async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "weeek-sess-"));
    const store = new SessionStore(
      cfg(path.join(dir, "missing.json"), {
        sessionCookie: "weeek_session=from-env",
        sessionWorkspaceId: 99,
      }),
    );
    const loaded = await store.load();
    expect(loaded).toEqual({
      workspaceId: 99,
      cookie: "weeek_session=from-env",
      savedAt: undefined,
    });
  });
});
