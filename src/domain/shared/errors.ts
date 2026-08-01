export type DomainErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "VALIDATION"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED"
  | "UPSTREAM"
  | "CONFIG"
  | "NETWORK";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly retryAfterSeconds?: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: DomainErrorCode,
    message: string,
    options?: { cause?: unknown; retryAfterSeconds?: number; details?: Record<string, unknown> },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "DomainError";
    this.code = code;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.details = options?.details;
  }
}

export class HttpError extends DomainError {
  readonly status: number;

  constructor(
    status: number,
    message: string,
    options?: { cause?: unknown; retryAfterSeconds?: number; details?: Record<string, unknown> },
  ) {
    const code =
      status === 401
        ? "UNAUTHORIZED"
        : status === 403
          ? "FORBIDDEN"
          : status === 404
            ? "NOT_FOUND"
            : status === 429
              ? "RATE_LIMITED"
              : status >= 500
                ? "UPSTREAM"
                : "UPSTREAM";
    super(code, message, options);
    this.name = "HttpError";
    this.status = status;
  }
}
