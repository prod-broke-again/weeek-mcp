# weeek-mcp

[MCP](https://modelcontextprotocol.io/) server for the [Weeek Public API](https://developers.weeek.net/). Read tools browse projects, search tasks, read attachments, and (with a browser session) load task comments. Opt-in write tools use mandatory propose → user confirmation → confirm flow.

## Features

| Can | Cannot |
|-----|--------|
| Projects, boards, columns, tasks | Weeek Docs / Wiki (not in Public API) |
| Search / filter tasks, my open tasks | Unconfirmed or autonomous writes |
| Opt-in task create/edit/move/delete | |
| Members & tags | PDF/DOCX text extract (v1: URL / text files only) |
| Attachments: images + txt/md/json/csv | |
| **Task comments** via imported browser session | Comments are **not** in Public API |

“Documents” here means **task attachments**, not Weeek Docs.

## Requirements

- Node.js ≥ 20
- Weeek API token (Workspace settings → API)

## Install

```bash
git clone https://github.com/prod-broke-again/weeek-mcp.git
cd weeek-mcp
npm install
npm run build
```

Optional: refresh vendored OpenAPI with `npm run fetch:openapi`, then `npm run generate:dto`.

## Configuration

Copy `.env.example` and set at least `WEEEK_API_TOKEN`. Never commit `.env` or session cookies.

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `WEEEK_API_TOKEN` | yes | — | Workspace API token |
| `WEEEK_DEFAULT_PROJECT_ID` | no | — | Used when tools omit `projectId` |
| `WEEEK_PROJECT_ALIASES` | no | — | e.g. `portal:4,ecd:7` |
| `WEEEK_READ_ONLY_PROJECTS` | no | all | Read whitelist of project ids |
| `WEEEK_WRITE_PROJECTS` | no | any readable | Write whitelist (requires `WEEEK_ALLOW_WRITE`) |
| `WEEEK_ALLOW_WRITE` | no | `false` | Expose guarded task write tools |
| `WEEEK_MAX_ATTACHMENT_BYTES` | no | `8388608` | 8 MiB |
| `WEEEK_CACHE_TTL_SECONDS` | no | `300` | Directory/project cache |
| `WEEEK_RPS` | no | `4` | Client-side rate limit |
| `WEEEK_LOG_LEVEL` | no | `info` | Logs go to **stderr** only |
| `WEEEK_BASE_URL` | no | `https://api.weeek.net/public/v1` | Public API |
| `WEEEK_APP_BASE_URL` | no | `https://api.weeek.net` | Private app API host |
| `WEEEK_SESSION_FILE` | no | `~/.weeek-mcp/session.json` | Browser session store |
| `WEEEK_SESSION_COOKIE` | no | — | Optional cookie override |
| `WEEEK_WORKSPACE_ID` | no | — | Needed if cookie string has no `workspace_id` |

## Cursor / Claude Code

Example Cursor MCP config (`~/.cursor/mcp.json` or project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "weeek": {
      "command": "node",
      "args": ["/absolute/path/to/weeek-mcp/dist/bin/weeek-mcp.js"],
      "env": {
        "WEEEK_API_TOKEN": "your-token",
        "WEEEK_DEFAULT_PROJECT_ID": "2",
        "WEEEK_READ_ONLY_PROJECTS": "2,5",
        "WEEEK_WRITE_PROJECTS": "5",
        "WEEEK_ALLOW_WRITE": "true"
      }
    }
  }
}
```

More examples: [`examples/mcp.cursor.json`](./examples/mcp.cursor.json), [`examples/mcp.claude.json`](./examples/mcp.claude.json).

## Tools

1. `weeek_context` — start here (`sessionComments: ready|missing`)
2. `weeek_auth_status` — session check + import instructions
3. `weeek_session_import` — paste session JSON
4. `weeek_list_projects`
5. `weeek_get_project`
6. `weeek_get_board`
7. `weeek_search_tasks`
8. `weeek_my_tasks`
9. `weeek_get_task` — card + comments when session is ready
10. `weeek_get_task_comments` — comments only
11. `weeek_get_task_tree`
12. `weeek_read_attachment`
13. `weeek_list_members`
14. `weeek_list_tags`
15. `weeek_propose_create_task`
16. `weeek_propose_update_task`
17. `weeek_propose_move_task`
18. `weeek_propose_delete_task`
19. `weeek_confirm_write` — only after a separate explicit user confirmation

Typical flow: `context` → (`auth_status` / `session_import` if needed) → `search_tasks` → `get_task` → `read_attachment`.

### Guarded writes

Writes are hidden unless `WEEEK_ALLOW_WRITE=true`. Scope writes with `WEEEK_WRITE_PROJECTS` (independent of the read whitelist). Enabling the flag does not permit autonomous changes:

1. The user explicitly asks for one exact change.
2. The agent calls the matching `weeek_propose_*` tool. This validates the payload but does not mutate Weeek.
3. The agent shows the preview and waits.
4. Only after a separate explicit “yes” does the agent call `weeek_confirm_write` with the single-use, expiring token.

Agents must never create, edit, move, or delete tasks on their own initiative and must never infer confirmation.

## Task comments (browser session)

Public API has no comments. The web app loads them from:

`GET https://api.weeek.net/ws/{workspaceId}/tm/tasks/{taskId}?withSubtasks=1`

with session cookies. `weeek_session` is **HttpOnly**, so `document.cookie` cannot see it.

### Import once

1. Call `weeek_auth_status` (or open a task via `weeek_get_task_comments`).
2. In https://app.weeek.net → DevTools → **Network** → open any task.
3. Find `api.weeek.net/ws/.../tm/tasks/...` → **Request Headers** → **Cookie** → copy the value.
4. Console: paste the helper from `weeek_auth_status`, then run  
   `weeekExportSession("PASTE_COOKIE_HERE")`  
   (or pass workspace id as the second argument).
5. Paste the JSON into chat / call `weeek_session_import`.

Session is stored at `~/.weeek-mcp/session.json` (Windows: `%USERPROFILE%\.weeek-mcp\session.json`).

**Security:** the cookie is a live login. Do not commit or share it. If leaked, log out of Weeek or rotate the password.

## Development

```bash
npm test
npm run typecheck
npm run build
npm run dev   # stdio MCP via tsx
```

OpenAPI is vendored at `openapi/weeek.json`. Layout: `domain` → `application` → `infrastructure` → `mcp`.

## License

MIT
