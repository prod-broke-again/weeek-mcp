import { DomainError, HttpError } from "../../domain/shared/errors.js";

export function mapToolError(err: unknown): { message: string; isError: true } {
  if (err instanceof HttpError || err instanceof DomainError) {
    return { message: actionableMessage(err), isError: true };
  }
  if (err instanceof Error) {
    return { message: err.message, isError: true };
  }
  return { message: String(err), isError: true };
}

function actionableMessage(err: DomainError): string {
  switch (err.code) {
    case "UNAUTHORIZED":
      return "Unauthorized (401). Check WEEEK_API_TOKEN — create/regenerate it in workspace settings → API.";
    case "FORBIDDEN":
      return err.message.includes("WEEEK_READ_ONLY")
        ? err.message
        : `Forbidden (403). The token creator has no access. ${err.message}`;
    case "NOT_FOUND":
      return err.message;
    case "RATE_LIMITED": {
      const wait = err.retryAfterSeconds !== undefined ? ` Retry after ~${err.retryAfterSeconds}s.` : "";
      return `Rate limited by Weeek (429).${wait} Lower WEEEK_RPS or wait.`;
    }
    case "PAYLOAD_TOO_LARGE":
      return err.message;
    case "CONFIG":
      return `Configuration error: ${err.message}`;
    case "VALIDATION":
      return err.message;
    case "NETWORK":
      return `Network error talking to Weeek: ${err.message}`;
    default:
      return err.message;
  }
}

/** Never leak secrets into error text. */
export function sanitizeErrorText(text: string, token?: string): string {
  if (!token) return text;
  return text.split(token).join("[REDACTED_TOKEN]");
}
