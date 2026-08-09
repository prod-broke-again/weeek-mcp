import { describe, expect, it } from "vitest";
import {
  assertProjectAllowed,
  assertProjectWritable,
  loadConfig,
  resolveProjectId,
} from "./Config.js";
import { DomainError } from "../../domain/shared/errors.js";

describe("loadConfig", () => {
  it("requires token", () => {
    expect(() => loadConfig({})).toThrow(DomainError);
  });

  it("parses aliases and whitelist", () => {
    const cfg = loadConfig({
      WEEEK_API_TOKEN: "tok",
      WEEEK_DEFAULT_PROJECT_ID: "4",
      WEEEK_PROJECT_ALIASES: "portal:4,ecd:7",
      WEEEK_READ_ONLY_PROJECTS: "4,7",
      WEEEK_WRITE_PROJECTS: "4",
      WEEEK_ALLOW_WRITE: "true",
    });
    expect(cfg.defaultProjectId).toBe(4);
    expect(cfg.projectAliases).toEqual({ portal: 4, ecd: 7 });
    expect(cfg.readOnlyProjects).toEqual([4, 7]);
    expect(cfg.writeProjects).toEqual([4]);
    expect(cfg.allowWrite).toBe(true);
    expect(resolveProjectId(cfg, "portal")).toBe(4);
    expect(resolveProjectId(cfg, undefined)).toBe(4);
    expect(cfg.sessionFilePath).toContain(".weeek-mcp");
    expect(cfg.pendingWritesDir).toContain("pending-writes");
    expect(cfg.appBaseUrl).toBe("https://api.weeek.net");
  });

  it("accepts session env overrides", () => {
    const cfg = loadConfig({
      WEEEK_API_TOKEN: "tok",
      WEEEK_SESSION_FILE: "D:/tmp/session.json",
      WEEEK_SESSION_COOKIE: "weeek_session=abc",
      WEEEK_WORKSPACE_ID: "846240",
    });
    expect(cfg.sessionFilePath).toBe("D:/tmp/session.json");
    expect(cfg.sessionCookie).toBe("weeek_session=abc");
    expect(cfg.sessionWorkspaceId).toBe(846240);
  });

  it("separates read and write project whitelists", () => {
    const cfg = loadConfig({
      WEEEK_API_TOKEN: "tok",
      WEEEK_READ_ONLY_PROJECTS: "2,5",
      WEEEK_WRITE_PROJECTS: "5",
      WEEEK_ALLOW_WRITE: "true",
    });
    expect(() => assertProjectAllowed(cfg, 2)).not.toThrow();
    expect(() => assertProjectAllowed(cfg, 5)).not.toThrow();
    expect(() => assertProjectAllowed(cfg, 7)).toThrow(/WEEEK_READ_ONLY_PROJECTS/);
    expect(() => assertProjectWritable(cfg, 5)).not.toThrow();
    expect(() => assertProjectWritable(cfg, 2)).toThrow(/WEEEK_WRITE_PROJECTS/);
  });
});
