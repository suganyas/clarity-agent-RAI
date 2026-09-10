import type { ResultEnvelope, StreamEvent } from "./result.js";

export function renderJsonResult(envelope: ResultEnvelope): string {
  return `${JSON.stringify(envelope)}\n`;
}

export function renderNdjsonEvent(event: StreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}
