import { SCHEMA_VERSION, type StreamEvent } from "../../output/result.js";
import type { TranscriptObservation } from "./events.js";

export function normalizeTranscriptObservation(observation: TranscriptObservation, sequence: number): StreamEvent {
  const event: StreamEvent = {
    schemaVersion: SCHEMA_VERSION,
    event: observation.kind,
    sequence,
    timestamp: observation.observedAt ?? new Date().toISOString(),
    source: observation.source,
  };

  if ("text" in observation) {
    event.text = observation.text;
  }
  if ("speaker" in observation && observation.speaker !== undefined) {
    event.speaker = observation.speaker;
  }
  if ("reason" in observation && observation.reason !== undefined) {
    event.reason = observation.reason;
  }
  if (observation.diagnostics !== undefined) {
    event.diagnostics = observation.diagnostics;
  }
  return event;
}
