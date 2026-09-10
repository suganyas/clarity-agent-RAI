import type { TranscriptObservation } from "../domain/transcript-stream/events.js";

export type { TranscriptObservation };

export interface TranscriptSource {
  observe(options?: TranscriptSourceOptions): AsyncIterable<TranscriptObservation>;
}

export interface TranscriptSourceOptions {
  idleTimeoutMs: number;
  maxDurationMs?: number;
  signal?: AbortSignal;
}
