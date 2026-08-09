import { randomBytes } from "node:crypto";
import { DomainError } from "../../domain/shared/errors.js";
import type { PendingWriteIntent, StoredWriteIntent } from "../../domain/task/write.js";

export class PendingWriteStore {
  private readonly pending = new Map<string, StoredWriteIntent>();

  constructor(
    private readonly ttlMs = 10 * 60 * 1000,
    private readonly now: () => number = Date.now,
  ) {}

  create(intent: PendingWriteIntent): { confirmationToken: string; expiresAt: string } {
    this.pruneExpired();
    const confirmationToken = randomBytes(24).toString("base64url");
    const createdAtMs = this.now();
    const expiresAtMs = createdAtMs + this.ttlMs;
    this.pending.set(confirmationToken, {
      intent,
      createdAt: new Date(createdAtMs).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
    });
    return {
      confirmationToken,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  consume(confirmationToken: string): StoredWriteIntent {
    const stored = this.pending.get(confirmationToken);
    if (!stored) {
      throw new DomainError(
        "VALIDATION",
        "Unknown or already used confirmation token. Propose the change again and ask the user to confirm it.",
      );
    }

    this.pending.delete(confirmationToken);
    if (Date.parse(stored.expiresAt) <= this.now()) {
      throw new DomainError(
        "VALIDATION",
        "Confirmation token expired. Propose the change again and ask the user to confirm it.",
      );
    }
    return stored;
  }

  private pruneExpired(): void {
    const now = this.now();
    for (const [token, stored] of this.pending) {
      if (Date.parse(stored.expiresAt) <= now) this.pending.delete(token);
    }
  }
}
