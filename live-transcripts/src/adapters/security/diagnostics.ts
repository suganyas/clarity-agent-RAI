import { redactValue } from "./redaction.js";

export interface RedactedDiagnostic {
  source: string;
  details: Record<string, unknown>;
}

export function createRedactedDiagnostic(source: string, details: Record<string, unknown>): RedactedDiagnostic {
  return {
    source,
    details: redactValue(details) as Record<string, unknown>,
  };
}
