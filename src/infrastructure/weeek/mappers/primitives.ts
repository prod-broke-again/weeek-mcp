/** Weeek often sends booleans as 0/1. */
export function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  if (value === null || value === undefined) return fallback;
  return Boolean(value);
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

/**
 * Normalize date-ish values for display/storage.
 * Accepts ISO, Y-m-d, dd.mm.yyyy — returns the original string when parseable-ish.
 */
export function normalizeDateString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value);
  // dd.mm.yyyy → yyyy-mm-dd
  const dmy = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return s;
}

/** Format Y-m-d or ISO to dd.mm.yyyy for Weeek filter query params. */
export function toWeeekFilterDate(value: string): string {
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (isoDate) return `${isoDate[3]}.${isoDate[2]}.${isoDate[1]}`;
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return value;
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }
  return value;
}
