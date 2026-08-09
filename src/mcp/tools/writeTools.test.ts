import { describe, expect, it } from "vitest";
import type { AppDeps } from "../deps.js";
import { createConfirmWriteTool } from "./confirmWrite.js";
import { createProposeCreateTaskTool } from "./proposeCreateTask.js";
import { createProposeDeleteTaskTool } from "./proposeDeleteTask.js";
import { createProposeMoveTaskTool } from "./proposeMoveTask.js";
import { createProposeUpdateTaskTool } from "./proposeUpdateTask.js";

const deps = {} as AppDeps;

describe("write tool safety descriptions", () => {
  it("requires an explicit request and a separate confirmation", () => {
    const proposeTools = [
      createProposeCreateTaskTool(deps),
      createProposeUpdateTaskTool(deps),
      createProposeMoveTaskTool(deps),
      createProposeDeleteTaskTool(deps),
    ];

    for (const tool of proposeTools) {
      expect(tool.tier).toBe("write");
      expect(tool.description).toContain("HARD RULE");
      expect(tool.description).toContain("user explicitly asked");
      expect(tool.description).toContain("DOES NOT mutate Weeek");
      expect(tool.description).toContain("WAIT");
      expect(tool.description).toContain("never guess ids");
    }

    const confirm = createConfirmWriteTool(deps);
    expect(confirm.tier).toBe("write");
    expect(confirm.description).toContain("ONLY TOOL THAT MUTATES WEEEK");
    expect(confirm.description).toContain("user explicitly confirmed");
    expect(confirm.description).toContain("Never infer confirmation");
    expect(confirm.description).toContain("single-use");
  });
});
