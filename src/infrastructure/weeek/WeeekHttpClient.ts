import { DomainError, HttpError } from "../../domain/shared/errors.js";
import type { Logger } from "../../domain/ports/Logger.js";
import type { Config } from "../config/Config.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
  /** Override timeout (ms) */
  timeoutMs?: number;
  /** Skip unwrap; return raw JSON */
  raw?: boolean;
  /** Envelope data key, e.g. "task", "tasks", "data" */
  envelopeKey?: string;
  /** Disable retries even for GET */
  noRetry?: boolean;
  signal?: AbortSignal;
}

export type FetchLike = typeof fetch;

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("aborted"));
      return;
    }
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(signal?.reason ?? new Error("aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function jitter(ms: number): number {
  const spread = ms * 0.2;
  return Math.max(0, Math.round(ms - spread + Math.random() * spread * 2));
}

export class WeeekHttpClient {
  private readonly config: Config;
  private readonly logger: Logger;
  private readonly fetchImpl: FetchLike;
  private readonly bucket: TokenBucket;

  constructor(config: Config, logger: Logger, fetchImpl: FetchLike = fetch) {
    this.config = config;
    this.logger = logger.child({ component: "WeeekHttpClient" });
    this.fetchImpl = fetchImpl;
    this.bucket = { tokens: config.rps, lastRefill: Date.now() };
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const url = this.buildUrl(path, options.query);
    const idempotent = method === "GET" || method === "PUT" || method === "DELETE";
    const maxAttempts =
      options.noRetry || !idempotent ? 1 : Math.max(1, this.config.maxRetries);

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.acquireToken();
      try {
        return await this.doOnce<T>(url, method, options);
      } catch (err) {
        lastError = err;
        const retryable =
          err instanceof HttpError &&
          (err.status === 429 || err.status >= 500) &&
          attempt < maxAttempts;
        if (!retryable) throw err;

        const waitMs =
          err.retryAfterSeconds !== undefined
            ? err.retryAfterSeconds * 1000
            : jitter(Math.min(8000, 250 * 2 ** (attempt - 1)));
        this.logger.warn("retrying Weeek request", {
          path,
          attempt,
          status: err.status,
          waitMs,
        });
        await sleep(waitMs, options.signal);
      }
    }
    throw lastError;
  }

  async download(
    url: string,
    options?: { timeoutMs?: number; signal?: AbortSignal },
  ): Promise<{ bytes: Uint8Array; contentType: string | null }> {
    await this.acquireToken();
    const timeoutMs = options?.timeoutMs ?? this.config.downloadTimeoutMs;
    const res = await this.fetchImpl(url, {
      method: "GET",
      signal: options?.signal ?? AbortSignal.timeout(timeoutMs),
      headers: {
        // Attachment CDN URLs are usually public signed links; do not send Bearer.
        Accept: "*/*",
      },
    });
    if (!res.ok) {
      throw new HttpError(res.status, `Failed to download attachment (${res.status})`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    return { bytes: buf, contentType: res.headers.get("content-type") };
  }

  private async doOnce<T>(url: string, method: HttpMethod, options: RequestOptions): Promise<T> {
    const timeoutMs = options.timeoutMs ?? this.config.requestTimeoutMs;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiToken}`,
      Accept: "application/json",
    };
    let body: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers,
        body,
        signal: options.signal ?? AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new DomainError("NETWORK", `Network error calling Weeek API: ${String(err)}`, {
        cause: err,
      });
    }

    const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
    const text = await res.text();
    let json: unknown = undefined;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        if (!res.ok) {
          throw new HttpError(res.status, `Weeek API ${res.status}: ${text.slice(0, 200)}`, {
            retryAfterSeconds: retryAfter,
          });
        }
        throw new DomainError("UPSTREAM", "Weeek API returned non-JSON response");
      }
    }

    if (!res.ok) {
      const message = extractErrorMessage(json) ?? `Weeek API error ${res.status}`;
      throw new HttpError(res.status, message, {
        retryAfterSeconds: retryAfter,
        details: typeof json === "object" && json !== null ? (json as Record<string, unknown>) : undefined,
      });
    }

    if (options.raw) return json as T;

    if (
      json &&
      typeof json === "object" &&
      "success" in json &&
      (json as { success: unknown }).success === false
    ) {
      throw new DomainError(
        "UPSTREAM",
        extractErrorMessage(json) ?? "Weeek API returned success=false",
        { details: json as Record<string, unknown> },
      );
    }

    if (options.envelopeKey) {
      if (!json || typeof json !== "object" || !(options.envelopeKey in json)) {
        throw new DomainError(
          "UPSTREAM",
          `Weeek response missing envelope key "${options.envelopeKey}"`,
          { details: { keys: json && typeof json === "object" ? Object.keys(json) : [] } },
        );
      }
      return (json as Record<string, unknown>)[options.envelopeKey] as T;
    }

    return json as T;
  }

  private buildUrl(
    path: string,
    query?: RequestOptions["query"],
  ): string {
    const base = this.config.baseUrl.replace(/\/$/, "");
    const p = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${base}${p}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          for (const item of value) {
            url.searchParams.append(`${key}[]`, String(item));
          }
        } else if (typeof value === "boolean") {
          url.searchParams.set(key, value ? "1" : "0");
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async acquireToken(): Promise<void> {
    const rate = this.config.rps;
    const now = Date.now();
    const elapsed = (now - this.bucket.lastRefill) / 1000;
    this.bucket.tokens = Math.min(rate, this.bucket.tokens + elapsed * rate);
    this.bucket.lastRefill = now;
    if (this.bucket.tokens >= 1) {
      this.bucket.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil(((1 - this.bucket.tokens) / rate) * 1000);
    await sleep(waitMs);
    this.bucket.tokens = Math.max(0, this.bucket.tokens);
    this.bucket.lastRefill = Date.now();
    this.bucket.tokens = Math.min(rate, this.bucket.tokens + waitMs / 1000 * rate) - 1;
  }
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const asInt = Number(header);
  if (Number.isFinite(asInt)) return asInt;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  }
  return undefined;
}

function extractErrorMessage(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const o = json as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  if (typeof o.error === "string") return o.error;
  if (o.error && typeof o.error === "object" && typeof (o.error as { message?: unknown }).message === "string") {
    return (o.error as { message: string }).message;
  }
  return undefined;
}
