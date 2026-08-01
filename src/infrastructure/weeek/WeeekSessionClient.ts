import { DomainError, HttpError } from "../../domain/shared/errors.js";
import type { Logger } from "../../domain/ports/Logger.js";
import type { Config } from "../config/Config.js";
import type { SessionData } from "../session/SessionStore.js";

export type FetchLike = typeof fetch;

/**
 * Client for Weeek private (app) API authenticated via browser session cookies.
 * Base: https://api.weeek.net (NOT /public/v1).
 */
export class WeeekSessionClient {
  constructor(
    private readonly config: Config,
    private readonly logger: Logger,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async getJson<T = unknown>(
    path: string,
    session: SessionData,
    options?: { query?: Record<string, string | number | boolean | undefined>; timeoutMs?: number },
  ): Promise<T> {
    const url = this.buildUrl(path, options?.query);
    const timeoutMs = options?.timeoutMs ?? this.config.requestTimeoutMs;

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
          Cookie: session.cookie,
          Referer: "https://app.weeek.net/",
          "X-Weeek-Lang": "ru-RU",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new DomainError("NETWORK", `Network error calling Weeek app API: ${String(err)}`, {
        cause: err,
      });
    }

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      throw new DomainError("UPSTREAM", "Weeek app API returned non-JSON response");
    }

    if (res.status === 401 || res.status === 403) {
      throw new HttpError(
        res.status,
        "Weeek session expired or unauthorized. Re-run weeek_auth_status and import a fresh session from the browser.",
      );
    }

    if (!res.ok) {
      const msg =
        json && typeof json === "object" && typeof (json as { message?: unknown }).message === "string"
          ? (json as { message: string }).message
          : `Weeek app API error ${res.status}`;
      throw new HttpError(res.status, msg);
    }

    if (json && typeof json === "object" && "success" in json) {
      const envelope = json as { success: unknown; code?: unknown; message?: unknown };
      if (envelope.success === false) {
        const code = envelope.code;
        const message =
          typeof envelope.message === "string"
            ? envelope.message
            : "Weeek app API returned success=false";
        if (code === 2000000 || /unauthenticated/i.test(message)) {
          throw new HttpError(
            401,
            "Weeek session expired. Import a fresh session via weeek_session_import.",
          );
        }
        throw new DomainError("UPSTREAM", message);
      }
    }

    return json as T;
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    const base = this.config.appBaseUrl.replace(/\/$/, "");
    const p = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${base}${p}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        if (typeof value === "boolean") url.searchParams.set(key, value ? "1" : "0");
        else url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }
}
