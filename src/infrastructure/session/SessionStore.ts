import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Config } from "../config/Config.js";
import { DomainError } from "../../domain/shared/errors.js";

export const SessionDataSchema = z.object({
  workspaceId: z.number().int().positive(),
  cookie: z.string().min(1),
  savedAt: z.string().optional(),
  userId: z.string().optional(),
});

export type SessionData = z.infer<typeof SessionDataSchema>;

export class SessionStore {
  private memory: SessionData | null | undefined = undefined;

  constructor(private readonly config: Config) {}

  get filePath(): string {
    return this.config.sessionFilePath;
  }

  /** Load session from env override or file. Does not validate against API. */
  async load(): Promise<SessionData | null> {
    if (this.memory !== undefined) return this.memory;

    if (this.config.sessionCookie && this.config.sessionWorkspaceId) {
      this.memory = {
        workspaceId: this.config.sessionWorkspaceId,
        cookie: normalizeCookieHeader(this.config.sessionCookie),
        savedAt: undefined,
      };
      return this.memory;
    }

    try {
      const raw = await fs.readFile(this.config.sessionFilePath, "utf8");
      const parsed = SessionDataSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        this.memory = null;
        return null;
      }
      this.memory = {
        ...parsed.data,
        cookie: normalizeCookieHeader(parsed.data.cookie),
      };
      return this.memory;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.memory = null;
        return null;
      }
      throw new DomainError(
        "CONFIG",
        `Failed to read session file ${this.config.sessionFilePath}: ${String(err)}`,
        { cause: err },
      );
    }
  }

  async save(data: SessionData): Promise<SessionData> {
    const normalized: SessionData = {
      workspaceId: data.workspaceId,
      cookie: normalizeCookieHeader(data.cookie),
      savedAt: data.savedAt ?? new Date().toISOString(),
      userId: data.userId,
    };
    const checked = SessionDataSchema.parse(normalized);
    await fs.mkdir(path.dirname(this.config.sessionFilePath), { recursive: true });
    await fs.writeFile(
      this.config.sessionFilePath,
      `${JSON.stringify(checked, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    this.memory = checked;
    return checked;
  }

  async clear(): Promise<void> {
    this.memory = null;
    try {
      await fs.unlink(this.config.sessionFilePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  /** Invalidate in-memory cache after failed probe (file kept until re-import). */
  invalidateCache(): void {
    this.memory = undefined;
  }

  parseImportPayload(raw: string): SessionData {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new DomainError("VALIDATION", "Empty session payload");
    }

    // Full JSON from console snippet
    if (trimmed.startsWith("{")) {
      let json: unknown;
      try {
        json = JSON.parse(trimmed);
      } catch {
        throw new DomainError("VALIDATION", "Session payload looks like JSON but failed to parse");
      }
      const parsed = SessionDataSchema.safeParse(json);
      if (!parsed.success) {
        throw new DomainError(
          "VALIDATION",
          `Invalid session JSON: need workspaceId + cookie. ${parsed.error.message}`,
        );
      }
      return {
        ...parsed.data,
        cookie: normalizeCookieHeader(parsed.data.cookie),
        savedAt: parsed.data.savedAt ?? new Date().toISOString(),
      };
    }

    // Raw Cookie header string — workspace from env/config required
    const workspaceId = this.config.sessionWorkspaceId;
    if (!workspaceId) {
      throw new DomainError(
        "VALIDATION",
        "Cookie string without JSON needs WEEEK_WORKSPACE_ID, or paste JSON { workspaceId, cookie } from the console snippet.",
      );
    }
    return {
      workspaceId,
      cookie: normalizeCookieHeader(trimmed),
      savedAt: new Date().toISOString(),
    };
  }
}

/** Keep only auth-relevant cookies; drop analytics noise if a full document.cookie was pasted. */
export function normalizeCookieHeader(cookie: string): string {
  const parts = cookie
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  const preferred = parts.filter((p) => {
    const name = p.split("=")[0]?.trim() ?? "";
    return (
      name === "weeek_session" ||
      name.startsWith("remember_app_") ||
      name === "workspace_id" ||
      name === "user_id" ||
      name === "cid"
    );
  });

  const selected = preferred.length > 0 ? preferred : parts;
  return selected.join("; ");
}
