import type { StreamEvent, StreamEventName, StreamEventSource } from "../../output/result.js";

export type TranscriptEvent = StreamEvent;
export type TranscriptEventName = StreamEventName;
export type TranscriptEventSource = StreamEventSource;

export interface TranscriptObservationBase {
  kind: TranscriptEventName;
  source: TranscriptEventSource;
  observedAt?: string;
  diagnostics?: Record<string, unknown>;
}

export interface TextTranscriptObservation extends TranscriptObservationBase {
  kind: "transcript" | "partial" | "correction";
  text: string;
  speaker?: string;
}

export interface ReasonTranscriptObservation extends TranscriptObservationBase {
  kind: "status" | "unavailable" | "error" | "end";
  reason?: string;
}

export type TranscriptObservation = TextTranscriptObservation | ReasonTranscriptObservation;
