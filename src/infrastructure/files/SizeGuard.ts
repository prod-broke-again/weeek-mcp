import { DomainError } from "../../domain/shared/errors.js";

export class SizeGuard {
  constructor(private readonly maxBytes: number) {}

  assertWithinLimit(size: number, label = "attachment"): void {
    if (size > this.maxBytes) {
      throw new DomainError(
        "PAYLOAD_TOO_LARGE",
        `${label} is ${size} bytes, exceeds WEEEK_MAX_ATTACHMENT_BYTES=${this.maxBytes}. Increase the limit or download the URL manually.`,
        { details: { size, maxBytes: this.maxBytes } },
      );
    }
  }

  get max(): number {
    return this.maxBytes;
  }
}
