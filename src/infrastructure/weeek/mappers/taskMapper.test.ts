import { describe, expect, it } from "vitest";
import { mapTask } from "./taskMapper.js";
import { toBool, toWeeekFilterDate, normalizeDateString } from "./primitives.js";

describe("primitives", () => {
  it("maps 0/1 to boolean", () => {
    expect(toBool(0)).toBe(false);
    expect(toBool(1)).toBe(true);
    expect(toBool("0")).toBe(false);
    expect(toBool("1")).toBe(true);
    expect(toBool(true)).toBe(true);
  });

  it("normalizes dd.mm.yyyy", () => {
    expect(normalizeDateString("01.01.2022")).toBe("2022-01-01");
    expect(normalizeDateString("2022-01-01")).toBe("2022-01-01");
  });

  it("formats filter dates to dd.mm.yyyy", () => {
    expect(toWeeekFilterDate("2022-01-15")).toBe("15.01.2022");
    expect(toWeeekFilterDate("15.01.2022")).toBe("15.01.2022");
  });
});

describe("mapTask", () => {
  it("maps locations and falls back to legacy fields", () => {
    const modern = mapTask({
      id: 10,
      title: "A",
      type: "action",
      isCompleted: 0,
      authorId: "u1",
      locations: [{ projectId: 4, boardId: 2, boardColumnId: 8 }],
      tags: [1],
      subscribers: [],
      subTasks: [11, 12],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      attachments: [{ id: "att-1", name: "a.png", size: 10, service: "weeek" }],
    });
    expect(modern.locations).toEqual([{ projectId: 4, boardId: 2, boardColumnId: 8 }]);
    expect(modern.isCompleted).toBe(false);
    expect(modern.subTaskIds).toEqual([11, 12]);
    expect(modern.attachments[0]?.id).toBe("att-1");

    const legacy = mapTask({
      id: 11,
      title: "B",
      type: "meet",
      isCompleted: 1,
      authorId: "u1",
      projectId: 7,
      boardId: 3,
      boardColumnId: 9,
      tags: [],
      subscribers: [],
      subTasks: [],
      createdAt: "",
      updatedAt: "",
    });
    expect(legacy.locations).toEqual([{ projectId: 7, boardId: 3, boardColumnId: 9 }]);
    expect(legacy.isCompleted).toBe(true);
  });

  it("maps due date from legacy date field", () => {
    const task = mapTask({
      id: 1,
      title: "Ring",
      type: "action",
      authorId: "u",
      date: "01.01.2022",
      tags: [],
      subscribers: [],
      subTasks: [],
    });
    expect(task.dueDate).toBe("2022-01-01");
  });
});
