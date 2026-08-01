import type { AppDeps } from "../deps.js";
import type { ToolRegistry } from "../ToolRegistry.js";
import { createContextTool } from "./context.js";
import { createListProjectsTool } from "./listProjects.js";
import { createGetProjectTool } from "./getProject.js";
import { createGetBoardTool } from "./getBoard.js";
import { createSearchTasksTool } from "./searchTasks.js";
import { createMyTasksTool } from "./myTasks.js";
import { createGetTaskTool } from "./getTask.js";
import { createGetTaskTreeTool } from "./getTaskTree.js";
import { createGetTaskCommentsTool } from "./getTaskComments.js";
import { createReadAttachmentTool } from "./readAttachment.js";
import { createListMembersTool } from "./listMembers.js";
import { createListTagsTool } from "./listTags.js";
import { createAuthStatusTool } from "./authStatus.js";
import { createSessionImportTool } from "./sessionImport.js";

export function registerAllTools(registry: ToolRegistry, deps: AppDeps): void {
  const tools = [
    createContextTool(deps),
    createAuthStatusTool(deps),
    createSessionImportTool(deps),
    createListProjectsTool(deps),
    createGetProjectTool(deps),
    createGetBoardTool(deps),
    createSearchTasksTool(deps),
    createMyTasksTool(deps),
    createGetTaskTool(deps),
    createGetTaskCommentsTool(deps),
    createGetTaskTreeTool(deps),
    createReadAttachmentTool(deps),
    createListMembersTool(deps),
    createListTagsTool(deps),
  ];
  for (const tool of tools) registry.register(tool);
}
