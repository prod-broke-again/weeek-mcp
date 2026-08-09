# WEEEK MCP Server (`weeek-mcp`)

Read-only MCP (Model Context Protocol) server for the WEEEK Public API and task comments via imported browser session.
Enables Cursor and Claude Code to search tasks, inspect project boards, view members/tags, read attachments, and load comments.

## Stack & Versions
- **Node.js:** >= 20
- **Language/Module:** TypeScript ^5.8, ESM (`"type": "module"`), NodeNext module resolution
- **MCP Protocol:** `@modelcontextprotocol/sdk` ^1.30.0
- **Validation & Logging:** `zod` ^3.24, `pino` ^9.6
- **Bundler & Test Runner:** `tsup` ^8.4, `vitest` ^3.0
- **OpenAPI DTO Generator:** `openapi-typescript` ^7.6 from `openapi/weeek.json`

## Commands
- `npm run dev` — Run MCP server locally over stdio via `tsx`
- `npm test` or `npm run test` — Run unit and integration tests once (`vitest run`)
- `npm run test:watch` — Run tests in watch mode (`vitest`)
- `npm run build` — Bundle TypeScript into executable `dist/bin/weeek-mcp.js` (runs `generate:dto` first)
- `npm run typecheck` or `npm run lint` — Typecheck codebase without emitting JS (`tsc --noEmit`)
- `npm run fetch:openapi` — Fetch latest OpenAPI spec from WEEEK developers portal
- `npm run generate:dto` — Generate TypeScript types from `openapi/weeek.json` to `src/infrastructure/weeek/dto/schema.ts`

## Directory Structure
- `src/bin/weeek-mcp.ts` — CLI entry point & dependency wiring
- `src/domain/` — Domain entities, repository interfaces, errors
- `src/application/` — Use cases (e.g. `SearchTasks`, `GetTask`, `ImportSession`) and `NameResolver`
- `src/infrastructure/` — `WeeekHttpClient`, `WeeekSessionClient`, `SessionStore`, repositories, TTL cache, config, logging
- `src/mcp/` — `McpServer` setup, `ToolRegistry`, and tool definitions in `src/mcp/tools/*.ts`
- `openapi/weeek.json` — Vendored WEEEK Public API specification
- `scripts/` — Utility scripts (OpenAPI fetcher)
- `examples/` — Configuration examples for Cursor and Claude Code (`mcp.cursor.json`, `mcp.claude.json`)

## Environments
Environment mode is determined by `.environment` in the project root (`local`).
As a client-side MCP server running over stdio, there is no separate database migration or remote deployment pipeline. However:
- `local`: Local development and test execution.
- Sensitive environment variables (`WEEEK_API_TOKEN`, session cookies) must stay in local `.env` or user-level config (`~/.weeek-mcp/session.json`).

## Project-Specific Rules & Prohibitions
1. **Never commit secrets:** Never commit `.env`, `session.json`, or raw `WEEEK_API_TOKEN` strings.
2. **Read-only by default:** Write tools are hidden unless `WEEEK_ALLOW_WRITE=true`. Scope mutations with `WEEEK_WRITE_PROJECTS` independently of the read whitelist (`WEEEK_READ_ONLY_PROJECTS`). Every task mutation must use `weeek_propose_*` → separate explicit user confirmation → `weeek_confirm_write`; never mutate Weeek on an agent's own initiative.
3. **Stderr logging only:** Log output must ONLY go to `stderr` (`pino` configured accordingly). Writing to `stdout` breaks the JSON-RPC stdio protocol of MCP.
4. **DTO generation discipline:** Do not manually edit `src/infrastructure/weeek/dto/schema.ts`. Always update `openapi/weeek.json` and run `npm run generate:dto`.
5. **Always typecheck and test before PRs:** Run `npm run typecheck` and `npm test` before committing changes.

## Decision Log
Architectural decisions, rationale, and rejected alternatives are documented in [docs/decisions.md](docs/decisions.md).
