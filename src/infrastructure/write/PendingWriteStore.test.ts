import { describe, expect, it } from "vitest";
import { PendingWriteStore } from "./PendingWriteStore.js";

const intent = {
  kind: "delete_task" as const,
  payload: { taskId: 42 },
  preview: "delete #42",
};

describe("PendingWriteStore", () => {
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
