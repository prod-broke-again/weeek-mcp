import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PendingWriteStore } from "./PendingWriteStore.js";

const intent = {
  kind: "delete_task" as const,
  payload: { taskId: 42 },
  preview: "delete #42",
};

describe("PendingWriteStore (memory)", () => {
  it("consumes a token only once", () => {
    const store = new PendingWriteStore();
    const { confirmationToken } = store.create(intent);

    expect(store.consume(confirmationToken).intent).toEqual(intent);
    expect(() => store.consume(confirmationToken)).toThrow(/already used/i);
  });

  it("rejects expired tokens", () => {
    let now = 1_000;
    const store = new PendingWriteStore(100, () => now);
    const { confirmationToken } = store.create(intent);
    now = 1_101;

    expect(() => store.consume(confirmationToken)).toThrow(/expired/i);
  });

  it("rejects unknown tokens", () => {
    const store = new PendingWriteStore();
    expect(() => store.consume("not-a-token")).toThrow(/unknown/i);
  });
});

describe("PendingWriteStore (file)", () => {
  it("shares tokens across store instances", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "weeek-pending-"));
    try {
      const writer = new PendingWriteStore(60_000, Date.now, dir);
      const reader = new PendingWriteStore(60_000, Date.now, dir);
      const { confirmationToken } = writer.create(intent);

      expect(reader.consume(confirmationToken).intent).toEqual(intent);
      expect(() => reader.consume(confirmationToken)).toThrow(/already used/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects expired file tokens", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "weeek-pending-"));
    try {
      let now = 1_000;
      const store = new PendingWriteStore(100, () => now, dir);
      const { confirmationToken } = store.create(intent);
      now = 1_101;
      expect(() => store.consume(confirmationToken)).toThrow(/expired/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
