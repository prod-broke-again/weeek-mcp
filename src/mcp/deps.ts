import type { Config } from "../infrastructure/config/Config.js";
import type { Logger } from "../domain/ports/Logger.js";
import type { GetContext } from "../application/usecases/GetContext.js";
import type { ListProjects } from "../application/usecases/ListProjects.js";
import type { GetProjectOverview } from "../application/usecases/GetProjectOverview.js";
import type { SearchTasks } from "../application/usecases/SearchTasks.js";
import type { GetTask } from "../application/usecases/GetTask.js";
import type { GetTaskTree } from "../application/usecases/GetTaskTree.js";
import type { GetBoardSnapshot } from "../application/usecases/GetBoardSnapshot.js";
import type { GetMyTasks } from "../application/usecases/GetMyTasks.js";
import type { ListMembers } from "../application/usecases/ListMembers.js";
import type { ListTags } from "../application/usecases/ListTags.js";
import type { ReadAttachment } from "../application/usecases/ReadAttachment.js";
import type { GetAuthStatus } from "../application/usecases/GetAuthStatus.js";
import type { ImportSession } from "../application/usecases/ImportSession.js";
import type { GetTaskComments } from "../application/usecases/GetTaskComments.js";

export interface AppDeps {
  config: Config;
  logger: Logger;
  getContext: GetContext;
  getAuthStatus: GetAuthStatus;
  importSession: ImportSession;
  listProjects: ListProjects;
  getProjectOverview: GetProjectOverview;
  searchTasks: SearchTasks;
  getTask: GetTask;
  getTaskComments: GetTaskComments;
  getTaskTree: GetTaskTree;
  getBoardSnapshot: GetBoardSnapshot;
  getMyTasks: GetMyTasks;
  listMembers: ListMembers;
  listTags: ListTags;
  readAttachment: ReadAttachment;
}
