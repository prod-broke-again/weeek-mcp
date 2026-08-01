import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { DomainError } from "../../domain/shared/errors.js";

export function defaultSessionFilePath(): string {
  return path.join(os.homedir(), ".weeek-mcp", "session.json");
}

const boolish = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(s)) return true;
    if (["0", "false", "no", "off", ""].includes(s)) return false;
    throw new Error(`Invalid boolean: ${v}`);
  });

const intList = z
  .union([z.string(), z.array(z.number())])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return [] as number[];
    if (Array.isArray(v)) return v;
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const n = Number(s);
        if (!Number.isInteger(n)) throw new Error(`Invalid project id: ${s}`);
        return n;
      });
  });

const aliases = z
  .union([z.string(), z.record(z.string(), z.number())])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return {} as Record<string, number>;
    if (typeof v !== "string") return v;
    const out: Record<string, number> = {};
    for (const part of v.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const [alias, idRaw] = trimmed.split(":");
      if (!alias || !idRaw) throw new Error(`Invalid alias entry: ${trimmed}`);
      const id = Number(idRaw);
      if (!Number.isInteger(id)) throw new Error(`Invalid alias id: ${trimmed}`);
      out[alias.trim().toLowerCase()] = id;
    }
    return out;
  });

export const ConfigSchema = z.object({
  apiToken: z.string().min(1, "WEEEK_API_TOKEN is required"),
  baseUrl: z.string().url().default("https://api.weeek.net/public/v1"),
  /** Host for private app API (session cookies), without /public/v1 */
  appBaseUrl: z.string().url().default("https://api.weeek.net"),
  defaultProjectId: z.number().int().positive().optional(),
  projectAliases: z.record(z.string(), z.number()).default({}),
  readOnlyProjects: z.array(z.number()).default([]),
  allowWrite: z.boolean().default(false),
  maxAttachmentBytes: z.number().int().positive().default(8_388_608),
  cacheTtlSeconds: z.number().int().nonnegative().default(300),
  rps: z.number().positive().default(4),
  logLevel: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  requestTimeoutMs: z.number().int().positive().default(15_000),
  downloadTimeoutMs: z.number().int().positive().default(30_000),
  maxRetries: z.number().int().nonnegative().default(3),
  sessionFilePath: z.string().min(1),
  /** Optional env override — used instead of/in addition to file */
  sessionCookie: z.string().optional(),
  sessionWorkspaceId: z.number().int().positive().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const defaultProjectRaw = env.WEEEK_DEFAULT_PROJECT_ID?.trim();
  const parsedDefault =
    defaultProjectRaw && defaultProjectRaw.length > 0 ? Number(defaultProjectRaw) : undefined;

  let projectAliases: Record<string, number>;
  let readOnlyProjects: number[];
  try {
    projectAliases = aliases.parse(env.WEEEK_PROJECT_ALIASES);
    readOnlyProjects = intList.parse(env.WEEEK_READ_ONLY_PROJECTS);
  } catch (err) {
    throw new DomainError("CONFIG", err instanceof Error ? err.message : String(err));
  }

  const wsRaw = env.WEEEK_WORKSPACE_ID?.trim();
  const parsedWs = wsRaw && wsRaw.length > 0 ? Number(wsRaw) : undefined;

  const raw = {
    apiToken: env.WEEEK_API_TOKEN,
    baseUrl: env.WEEEK_BASE_URL || "https://api.weeek.net/public/v1",
    appBaseUrl: env.WEEEK_APP_BASE_URL || "https://api.weeek.net",
    defaultProjectId: Number.isFinite(parsedDefault) ? parsedDefault : undefined,
    projectAliases,
    readOnlyProjects,
    allowWrite: env.WEEEK_ALLOW_WRITE !== undefined ? boolish.parse(env.WEEEK_ALLOW_WRITE) : false,
    maxAttachmentBytes: env.WEEEK_MAX_ATTACHMENT_BYTES
      ? Number(env.WEEEK_MAX_ATTACHMENT_BYTES)
      : 8_388_608,
    cacheTtlSeconds: env.WEEEK_CACHE_TTL_SECONDS ? Number(env.WEEEK_CACHE_TTL_SECONDS) : 300,
    rps: env.WEEEK_RPS ? Number(env.WEEEK_RPS) : 4,
    logLevel: env.WEEEK_LOG_LEVEL || "info",
    sessionFilePath: env.WEEEK_SESSION_FILE?.trim() || defaultSessionFilePath(),
    sessionCookie: env.WEEEK_SESSION_COOKIE?.trim() || undefined,
    sessionWorkspaceId: Number.isFinite(parsedWs) ? parsedWs : undefined,
  };

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new DomainError("CONFIG", `Invalid configuration: ${msg}`);
  }
  return result.data;
}

/** Resolve project id from number, string number, or configured alias. */
export function resolveProjectId(
  config: Config,
  input?: number | string | null,
): number | undefined {
  if (input === undefined || input === null || input === "") {
    return config.defaultProjectId;
  }
  if (typeof input === "number") return input;
  const asNum = Number(input);
  if (Number.isInteger(asNum) && String(asNum) === String(input).trim()) return asNum;
  const alias = config.projectAliases[input.trim().toLowerCase()];
  if (alias !== undefined) return alias;
  throw new DomainError(
    "VALIDATION",
    `Unknown project "${input}". Use numeric id or alias from weeek_list_projects / weeek_context.`,
  );
}

export function assertProjectAllowed(config: Config, projectId: number): void {
  if (config.readOnlyProjects.length === 0) return;
  if (!config.readOnlyProjects.includes(projectId)) {
    throw new DomainError(
      "FORBIDDEN",
      `Project ${projectId} is outside WEEEK_READ_ONLY_PROJECTS whitelist (${config.readOnlyProjects.join(", ")}).`,
    );
  }
}
