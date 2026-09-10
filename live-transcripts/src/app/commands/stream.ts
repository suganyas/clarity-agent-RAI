import { normalizeTranscriptObservation } from "../../domain/transcript-stream/normalize.js";
import { renderHumanError } from "../../output/human.js";
import { renderNdjsonEvent } from "../../output/json.js";
import type { AppError, StreamEvent } from "../../output/result.js";
import type { TranscriptSource } from "../../ports/transcript-source.js";
import type { CommandResult } from "./status.js";

export interface StreamCommandOptions {
  command: "stream";
  output: "human" | "json";
  idleTimeoutMs: number;
  maxDurationMs?: number;
  signal?: AbortSignal;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
  useTui?: boolean;
}

export async function runStream(source: TranscriptSource, options: StreamCommandOptions): Promise<CommandResult> {
  let sequence = 0;
  let sawUnavailable = false;
  const chunks: string[] = [];
  const humanState = { wroteTranscript: false, currentLine: "", lineOpen: false, currentSpeaker: undefined as string | undefined };

  for await (const observation of source.observe(options)) {
    const event = normalizeTranscriptObservation(observation, ++sequence);
    if (event.event === "unavailable") sawUnavailable = true;
    emitRendered(event, options, chunks, humanState);
    if (event.event === "unavailable" || event.event === "error") break;
  }

  if (sequence === 0) {
    const event: StreamEvent = {
      schemaVersion: 1,
      event: "unavailable",
      sequence: 1,
      timestamp: new Date().toISOString(),
      source: "unknown",
      reason: "no transcript source detected",
    };
    sawUnavailable = true;
    emitRendered(event, options, chunks, humanState);
  } else if (!sawUnavailable) {
    const endEvent: StreamEvent = {
      schemaVersion: 1,
      event: "end",
      sequence: sequence + 1,
      timestamp: new Date().toISOString(),
      source: "unknown",
      reason: "stream ended",
    };
    emitRendered(endEvent, options, chunks, humanState);
  }

  const output = chunks.join("");
  if (sawUnavailable) {
    if (options.output === "json") {
      return options.onStdout ? { exitCode: 20 } : { exitCode: 20, stdout: output };
    }
    return options.onStderr ? { exitCode: 20 } : { exitCode: 20, stderr: output };
  }
  return options.onStdout ? { exitCode: 0 } : { exitCode: 0, stdout: output };
}

function emitRendered(
  event: StreamEvent,
  options: StreamCommandOptions,
  chunks: string[],
  humanState: HumanRenderState,
): void {
  const rendered = renderEvent(event, options.output, humanState, options.useTui === true);
  if (options.output === "json") {
    options.onStdout?.(rendered);
  } else if (event.event === "unavailable" || event.event === "error") {
    options.onStderr?.(rendered);
  } else {
    options.onStdout?.(rendered);
  }
  if (!options.onStdout && !options.onStderr) {
    chunks.push(rendered);
  }
}

interface HumanRenderState {
  wroteTranscript: boolean;
  currentLine: string;
  lineOpen: boolean;
  currentSpeaker: string | undefined;
}

function renderEvent(event: StreamEvent, output: "human" | "json", humanState: HumanRenderState, useTui: boolean): string {
  if (output === "json") return renderNdjsonEvent(event);
  if (event.event === "correction") {
    if (humanState.lineOpen && isLikelyRewrite(event.text ?? "", humanState.currentLine)) {
      humanState.currentLine = event.text ?? humanState.currentLine;
      humanState.currentSpeaker = event.speaker ?? humanState.currentSpeaker;
      return renderCurrentLine(humanState, event.text ?? "", useTui);
    }
  }
  if (event.event === "transcript" || event.event === "correction") {
    const prefix = humanState.wroteTranscript ? "\n\n" : "";
    const speakerChanged = event.speaker !== undefined && event.speaker !== humanState.currentSpeaker;
    humanState.wroteTranscript = true;
    humanState.currentLine = event.text ?? "";
    humanState.currentSpeaker = event.speaker ?? humanState.currentSpeaker;
    humanState.lineOpen = true;
    if (speakerChanged) {
      return `${prefix}${event.speaker}\n${renderCurrentLine(humanState, event.text ?? "", useTui)}`;
    }
    return `${prefix}${renderCurrentLine(humanState, event.text ?? "", useTui)}`;
  }
  if (event.event === "partial") {
    humanState.wroteTranscript = true;
    humanState.currentLine += event.text ?? "";
    humanState.lineOpen = true;
    return useTui ? renderCurrentLine(humanState, event.text ?? "", true) : (event.text ?? "");
  }
  if (event.event === "unavailable" || event.event === "error") {
    const prefix = humanState.lineOpen ? "\n" : "";
    humanState.lineOpen = false;
    const error: AppError = {
      code: event.event === "unavailable" ? "TRANSCRIPT_UNAVAILABLE" : "TRANSCRIPT_ERROR",
      message: event.reason ?? "Transcript stream is unavailable",
      exitCode: event.event === "unavailable" ? 20 : 1,
    };
    return `${prefix}${renderHumanError(error)}`;
  }
  if (event.event === "end" && humanState.lineOpen) {
    humanState.lineOpen = false;
    return "\n";
  }
  return "";
}

function renderCurrentLine(humanState: HumanRenderState, fallback: string, useTui: boolean): string {
  const text = humanState.currentLine || fallback;
  return useTui ? `\r\u001b[2K${text}` : text;
}

function isLikelyRewrite(nextText: string, currentText: string): boolean {
  if (!nextText || !currentText) return false;
  if (nextText === currentText) return true;
  if (nextText.startsWith(currentText) || currentText.startsWith(nextText)) return true;
  const common = commonPrefixLength(nextText, currentText);
  return common >= 20 && common / Math.min(nextText.length, currentText.length) >= 0.65;
}

function commonPrefixLength(a: string, b: string): number {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) {
    index += 1;
  }
  return index;
}
