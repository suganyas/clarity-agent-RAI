const SENSITIVE_KEYS = /authorization|cookie|token|secret|assertion|password|signature/i;
const SENSITIVE_QUERY_KEYS = /token|secret|assertion|signature|code/i;
const LONG_TEXT_THRESHOLD = 48;

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (isRecord(value)) {
    const redacted: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      redacted[key] = SENSITIVE_KEYS.test(key) ? "[REDACTED]" : redactValue(entry);
    }
    return redacted;
  }
  return value;
}

function redactString(value: string): string {
  if (looksLikeUrl(value)) {
    return redactUrl(value);
  }
  if (value.length > LONG_TEXT_THRESHOLD && /\s/.test(value)) {
    return "[REDACTED_TEXT]";
  }
  return value;
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!url.search) return value;
    let redacted = value;
    for (const [key, entryValue] of Array.from(url.searchParams.entries())) {
      if (SENSITIVE_QUERY_KEYS.test(key)) {
        redacted = redacted.replace(`${key}=${encodeURIComponent(entryValue)}`, `${key}=%5BREDACTED%5D`);
        redacted = redacted.replace(`${key}=${entryValue}`, `${key}=%5BREDACTED%5D`);
      }
    }
    return redacted;
  } catch {
    return value;
  }
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
