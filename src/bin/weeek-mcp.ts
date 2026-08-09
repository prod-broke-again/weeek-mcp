import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "../infrastructure/config/Config.js";
import { createPinoLogger } from "../infrastructure/logging/PinoLogger.js";
import { TtlCache } from "../infrastructure/cache/TtlCache.js";
import { WeeekHttpClient } from "../infrastructure/weeek/WeeekHttpClient.js";
import { WeeekSessionClient } from "../infrastructure/weeek/WeeekSessionClient.js";
import { SessionStore } from "../infrastructure/session/SessionStore.js";
import { WeeekTaskRepository } from "../infrastructure/weeek/repositories/WeeekTaskRepository.js";
import { WeeekProjectRepository } from "../infrastructure/weeek/repositories/WeeekProjectRepository.js";
import { WeeekDirectoryRepository } from "../infrastructure/weeek/repositories/WeeekDirectoryRepository.js";
import { WeeekAttachmentRepository } from "../infrastructure/weeek/repositories/WeeekAttachmentRepository.js";
import { WeeekSessionCommentRepository } from "../infrastructure/weeek/repositories/WeeekSessionCommentRepository.js";
import { SizeGuard } from "../infrastructure/files/SizeGuard.js";
import { NameResolver } from "../application/enrichment/NameResolver.js";
import { GetContext } from "../application/usecases/GetContext.js";
import { GetAuthStatus } from "../application/usecases/GetAuthStatus.js";
import { ImportSession } from "../application/usecases/ImportSession.js";
import { ListProjects } from "../application/usecases/ListProjects.js";
import { GetProjectOverview } from "../application/usecases/GetProjectOverview.js";
import { SearchTasks } from "../application/usecases/SearchTasks.js";
import { GetTask } from "../application/usecases/GetTask.js";
import { GetTaskComments } from "../application/usecases/GetTaskComments.js";
import { GetTaskTree } from "../application/usecases/GetTaskTree.js";
import { GetBoardSnapshot } from "../application/usecases/GetBoardSnapshot.js";
import { GetMyTasks } from "../application/usecases/GetMyTasks.js";
import { ListMembers } from "../application/usecases/ListMembers.js";
import { ListTags } from "../application/usecases/ListTags.js";
import { ReadAttachment } from "../application/usecases/ReadAttachment.js";
import { createMcpServer } from "../mcp/server.js";
import type { AppDeps } from "../mcp/deps.js";
import { DomainError } from "../domain/shared/errors.js";
import { PendingWriteStore } from "../infrastructure/write/PendingWriteStore.js";
import { ProposeCreateTask } from "../application/usecases/ProposeCreateTask.js";
import { ProposeUpdateTask } from "../application/usecases/ProposeUpdateTask.js";
import { ProposeMoveTask } from "../application/usecases/ProposeMoveTask.js";
import { ProposeDeleteTask } from "../application/usecases/ProposeDeleteTask.js";
import { ConfirmWrite } from "../application/usecases/ConfirmWrite.js";

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    const msg = err instanceof DomainError || err instanceof Error ? err.message : String(err);
    console.error(`weeek-mcp: ${msg}`);
    process.exit(1);
  }

  const logger = createPinoLogger(config.logLevel);
  const cache = new TtlCache(config.cacheTtlSeconds);
  const http = new WeeekHttpClient(config, logger);
  const sessionStore = new SessionStore(config);
  const sessionClient = new WeeekSessionClient(config, logger);
  const sessionComments = new WeeekSessionCommentRepository(sessionStore, sessionClient, logger);
  const sizeGuard = new SizeGuard(config.maxAttachmentBytes);

  const tasks = new WeeekTaskRepository(http);
  const projects = new WeeekProjectRepository(http, config, cache);
  const directory = new WeeekDirectoryRepository(http, cache);
  const attachments = new WeeekAttachmentRepository(http, sizeGuard);
  const names = new NameResolver(directory, projects, logger);
  const pendingWrites = new PendingWriteStore(
    10 * 60 * 1000,
    Date.now,
    config.allowWrite ? config.pendingWritesDir : undefined,
  );

  const deps: AppDeps = {
    config,
    logger,
    getContext: new GetContext(directory, projects, config, sessionComments),
    getAuthStatus: new GetAuthStatus(sessionComments, sessionStore),
    importSession: new ImportSession(sessionStore, sessionComments),
    listProjects: new ListProjects(projects, config),
    getProjectOverview: new GetProjectOverview(projects, config),
    searchTasks: new SearchTasks(tasks, config, names),
    getTask: new GetTask(tasks, names, sessionComments, logger),
    getTaskComments: new GetTaskComments(sessionComments, sessionStore),
    getTaskTree: new GetTaskTree(tasks, names),
    getBoardSnapshot: new GetBoardSnapshot(projects, tasks, config, names),
    getMyTasks: new GetMyTasks(directory, tasks, config, names),
    listMembers: new ListMembers(directory),
    listTags: new ListTags(directory),
    readAttachment: new ReadAttachment(attachments),
    proposeCreateTask: new ProposeCreateTask(projects, config, pendingWrites),
    proposeUpdateTask: new ProposeUpdateTask(tasks, config, pendingWrites),
    proposeMoveTask: new ProposeMoveTask(tasks, projects, config, pendingWrites),
    proposeDeleteTask: new ProposeDeleteTask(tasks, config, pendingWrites),
    confirmWrite: new ConfirmWrite(tasks, directory, pendingWrites),
  };

  const server = createMcpServer(deps);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("weeek-mcp listening on stdio");
}

main().catch((err) => {
  console.error("weeek-mcp fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
