import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DomainError } from "../../domain/shared/errors.js";
import type { PendingWriteIntent, StoredWriteIntent } from "../../domain/task/write.js";

/**
 * Pending confirmation tokens.
 *
 * Memory mode is fine for a long-lived stdio process.
 * File mode is required under HTTP gateways that spawn a new MCP process per
 * request (e.g. supergateway stateless streamableHttp) — otherwise propose and
 * confirm never share state.
 */
export class PendingWriteStore {
  private readonly pending = new Map<string, StoredWriteIntent>();

  constructor(
    private readonly ttlMs = 10 * 60 * 1000,
    private readonly now: () => number = Date.now,
    private readonly dirPath?: string,
  ) {}

  create(intent: PendingWriteIntent): { confirmationToken: string; expiresAt: string } {
    this.pruneExpired();
    const confirmationToken = randomBytes(24).toString("base64url");
    const createdAtMs = this.now();
    const expiresAtMs = createdAtMs + this.ttlMs;
    const stored: StoredWriteIntent = {
      intent,
      createdAt: new Date(createdAtMs).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
    };

    if (this.dirPath) {
      this.writeFile(confirmationToken, stored);
    } else {
      this.pending.set(confirmationToken, stored);
    }

    return {
      confirmationToken,
      expiresAt: stored.expiresAt,
    };
  }

  consume(confirmationToken: string): StoredWriteIntent {
    const stored = this.dirPath
      ? this.consumeFile(confirmationToken)
      : this.consumeMemory(confirmationToken);

    if (Date.parse(stored.expiresAt) <= this.now()) {
      throw new DomainError(
        "VALIDATION",
        "Confirmation token expired. Propose the change again and ask the user to confirm it.",
      );
    }
    return stored;
  }

  private consumeMemory(confirmationToken: string): StoredWriteIntent {
    const stored = this.pending.get(confirmationToken);
    if (!stored) {
      throw this.unknownTokenError();
    }
    this.pending.delete(confirmationToken);
    return stored;
  }

  private consumeFile(confirmationToken: string): StoredWriteIntent {
    const filePath = this.tokenPath(confirmationToken);
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw this.unknownTokenError();
      }
      throw new DomainError(
        "CONFIG",
        `Failed to read pending write token: ${String(err)}`,
        { cause: err },
      );
    }

    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        // Another process won the race — treat as already used.
        throw this.unknownTokenError();
      }
      throw new DomainError(
        "CONFIG",
        `Failed to consume pending write token: ${String(err)}`,
        { cause: err },
      );
    }

    try {
      return JSON.parse(raw) as StoredWriteIntent;
    } catch (err) {
      throw new DomainError(
        "CONFIG",
        `Corrupt pending write token file ${filePath}`,
        { cause: err },
      );
    }
  }

  private writeFile(confirmationToken: string, stored: StoredWriteIntent): void {
    if (!this.dirPath) return;
    fs.mkdirSync(this.dirPath, { recursive: true, mode: 0o700 });
    const filePath = this.tokenPath(confirmationToken);
    const tmpPath = `${filePath}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
    fs.writeFileSync(tmpPath, `${JSON.stringify(stored)}\n`, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tmpPath, filePath);
  }

  private tokenPath(confirmationToken: string): string {
    if (!this.dirPath) throw new Error("dirPath required");
    // base64url is filesystem-safe; still reject path separators defensively.
    if (confirmationToken.includes("/") || confirmationToken.includes("\\") || confirmationToken.includes("..")) {
      throw this.unknownTokenError();
    }
    return path.join(this.dirPath, `${confirmationToken}.json`);
  }

  private pruneExpired(): void {
    const now = this.now();
    if (this.dirPath) {
      this.pruneExpiredFiles(now);
      return;
    }
    for (const [token, stored] of this.pending) {
      if (Date.parse(stored.expiresAt) <= now) this.pending.delete(token);
    }
  }

  private pruneExpiredFiles(now: number): void {
    if (!this.dirPath) return;
    let entries: string[];
    try {
      entries = fs.readdirSync(this.dirPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
      return;
    }
    for (const name of entries) {
      if (!name.endsWith(".json")) continue;
      const filePath = path.join(this.dirPath, name);
      try {
        const stored = JSON.parse(fs.readFileSync(filePath, "utf8")) as StoredWriteIntent;
        if (Date.parse(stored.expiresAt) <= now) fs.unlinkSync(filePath);
      } catch {
        // Ignore unreadable leftovers; consume will surface real errors.
      }
    }
  }

  private unknownTokenError(): DomainError {
    return new DomainError(
      "VALIDATION",
      "Unknown or already used confirmation token. Propose the change again and ask the user to confirm it.",
    );
  }
}
