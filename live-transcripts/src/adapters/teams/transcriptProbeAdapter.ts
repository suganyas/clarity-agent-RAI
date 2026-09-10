import type { Page } from "playwright-core";
import type { TranscriptObservation } from "../../domain/transcript-stream/events.js";
import type { TranscriptSource, TranscriptSourceOptions } from "../../ports/transcript-source.js";
import { EdgeCdpClient } from "../edge-cdp/edgeCdpClient.js";
import { createRedactedDiagnostic } from "../security/diagnostics.js";

const POLL_INTERVAL_MS = 500;

interface CaptionCandidate {
  text: string;
  speaker?: string;
}

export interface TranscriptProbeAdapterOptions {
  cdpEndpoint: string;
}

export class TranscriptProbeAdapter implements TranscriptSource {
  constructor(private readonly options: TranscriptProbeAdapterOptions) {}

  async *observe(options: TranscriptSourceOptions): AsyncIterable<TranscriptObservation> {
    const connection = await new EdgeCdpClient(this.options.cdpEndpoint).connect();
    if (connection.pages.length === 0) {
      yield unavailable("CDP endpoint is unreachable", { diagnostic: connection.diagnostics });
      return;
    }

    const page = await findTeamsPage(connection.pages);
    if (!page) {
      await connection.close();
      yield unavailable("No Teams tab found", { pageCount: connection.pages.length });
      return;
    }

    let idleDeadline: number | undefined = Date.now() + options.idleTimeoutMs;
    const maxDeadline = options.maxDurationMs === undefined ? undefined : Date.now() + options.maxDurationMs;
    let emittedCount = 0;
    let lastEmittedText = "";
    let lastSpeaker: string | undefined;
    try {
      while (!isPast(idleDeadline) && !options.signal?.aborted && !isPast(maxDeadline)) {
        const candidates = await readCaptionCandidates(page);
        const candidate = selectCaptionCandidate(candidates);

        if (candidate) {
          if (candidate.text === lastEmittedText) {
            await sleep(POLL_INTERVAL_MS);
            continue;
          }

          if (lastEmittedText && isLikelySameUtterance(candidate.text, lastEmittedText)) {
            lastEmittedText = candidate.text;
            lastSpeaker = candidate.speaker ?? lastSpeaker;
            emittedCount += 1;
            idleDeadline = undefined;
            const observation: TranscriptObservation = {
              kind: "correction",
              source: "dom",
              text: candidate.text,
              observedAt: new Date().toISOString(),
            };
            const speaker = candidate.speaker ?? lastSpeaker;
            if (speaker) observation.speaker = speaker;
            yield observation;
          } else {
            lastEmittedText = candidate.text;
            lastSpeaker = candidate.speaker;
            emittedCount += 1;
            idleDeadline = undefined;
            const observation: TranscriptObservation = {
              kind: "transcript",
              source: "dom",
              text: candidate.text,
              observedAt: new Date().toISOString(),
            };
            if (candidate.speaker) observation.speaker = candidate.speaker;
            yield observation;
          }
        }
        await sleep(POLL_INTERVAL_MS);
      }
      if (options.signal?.aborted) {
        yield {
          kind: "end",
          source: "unknown",
          reason: "interrupted",
          observedAt: new Date().toISOString(),
        };
      } else if (emittedCount === 0) {
        yield unavailable("no transcript source detected", {
          diagnostic: createRedactedDiagnostic("transcript-probe-timeout", {
            idleTimeoutMs: options.idleTimeoutMs,
            maxDurationMs: options.maxDurationMs,
          }),
        });
      }
    } finally {
      await connection.close();
    }
  }
}

async function findTeamsPage(pages: readonly Page[]): Promise<Page | undefined> {
  for (const page of pages) {
    const title = await page.title().catch(() => "");
    if (/teams/i.test(title) || /teams/i.test(page.url())) return page;
  }
  return undefined;
}

async function readCaptionCandidates(page: Page): Promise<CaptionCandidate[]> {
  return page
    .evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('span[data-tid="closed-caption-text"]'));
      return candidates
        .map((node) => {
          const element = node as Element;
          const rect = element.getBoundingClientRect();
          const textContent = (node.textContent ?? "").trim();
          const lines = textContent
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean);
          const text = (lines.length > 1 ? lines.slice(1).join(" ") : textContent).trim().replace(/\s+/g, " ");
          const firstLine = lines[0];
          const speakerFromLines = lines.length > 1 && firstLine && firstLine.length < 80 ? firstLine : undefined;
          const speaker =
            speakerFromLines ||
            findRowSpeaker(node, text) ||
            findNearbySpeaker(node, text) ||
            parseSpeakerFromAttributes(node, text);
          return speaker ? { text, speaker, rect } : { text, rect };
        })
        .filter(
          (candidate) =>
            candidate.text.length > 0 &&
            candidate.text.length < 500 &&
            candidate.rect.width > 0 &&
            candidate.rect.height > 0 &&
            candidate.rect.y >= 0,
        )
        .map(({ rect: _rect, ...candidate }) => candidate);

      function findNearbySpeaker(node: Element, captionText: string): string | undefined {
        let current: Element | null = node;
        for (let depth = 0; current && depth < 4; depth += 1) {
          const label = current.querySelector(
            '[data-tid*="speaker" i], [class*="speaker" i], [aria-label*="speaker" i], [data-tid*="name" i], [class*="name" i]',
          );
          const labelText = (label?.textContent ?? "").trim().replace(/\s+/g, " ");
          if (labelText && labelText !== captionText && labelText.length < 80) return labelText;
          current = current.parentElement;
        }
        return undefined;
      }

      function findRowSpeaker(node: Element, captionText: string): string | undefined {
        let current: Element | null = node.parentElement;
        for (let depth = 0; current && depth < 5; depth += 1) {
          const children = Array.from(current.children);
          const captionChildIndex = children.findIndex((child) => (child.textContent ?? "").includes(captionText));
          if (captionChildIndex > 0) {
            for (let index = captionChildIndex - 1; index >= 0; index -= 1) {
              const text = (children[index]?.textContent ?? "").trim().replace(/\s+/g, " ");
              if (isLikelySpeakerLabel(text, captionText)) return text;
            }
          }

          if (children.length >= 2) {
            const first = (children[0]?.textContent ?? "").trim().replace(/\s+/g, " ");
            const rest = children
              .slice(1)
              .map((child) => child.textContent ?? "")
              .join(" ");
            if (rest.includes(captionText) && isLikelySpeakerLabel(first, captionText)) return first;
          }
          current = current.parentElement;
        }
        return undefined;
      }

      function isLikelySpeakerLabel(text: string, captionText: string): boolean {
        return text.length > 0 && text.length < 100 && text !== captionText && !captionText.startsWith(text);
      }

      function parseSpeakerFromAttributes(node: Element, captionText: string): string | undefined {
        const attrs = ["aria-label", "title", "data-tid"];
        let current: Element | null = node;
        for (let depth = 0; current && depth < 4; depth += 1) {
          for (const attr of attrs) {
            const value = current.getAttribute(attr) ?? "";
            const normalized = value.trim().replace(/\s+/g, " ");
            const colonIndex = normalized.indexOf(":");
            if (colonIndex > 0) {
              const possibleSpeaker = normalized.slice(0, colonIndex).trim();
              const possibleText = normalized.slice(colonIndex + 1).trim();
              if (possibleSpeaker.length < 80 && (!possibleText || captionText.startsWith(possibleText))) {
                return possibleSpeaker;
              }
            }
          }
          current = current.parentElement;
        }
        return undefined;
      }
    })
    .catch(() => []);
}

function unavailable(reason: string, diagnostics?: Record<string, unknown>): TranscriptObservation {
  const observation: TranscriptObservation = {
    kind: "unavailable",
    source: "unknown",
    reason,
    observedAt: new Date().toISOString(),
  };
  if (diagnostics !== undefined) {
    observation.diagnostics = diagnostics;
  }
  return observation;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isPast(deadline: number | undefined): boolean {
  return deadline !== undefined && Date.now() >= deadline;
}

function selectCaptionCandidate(candidates: readonly CaptionCandidate[]): CaptionCandidate | undefined {
  const normalized = candidates
    .map((candidate) => ({ ...candidate, text: candidate.text.trim() }))
    .filter((candidate) => candidate.text.length > 0);
  return normalized[normalized.length - 1];
}

function shouldEmitCaption(text: string, lastEmittedText: string): boolean {
  if (!lastEmittedText) return true;
  if (text === lastEmittedText) return false;
  return !text.startsWith(lastEmittedText);
}

function isLikelySameUtterance(nextText: string, currentText: string): boolean {
  if (nextText.startsWith(currentText) || currentText.startsWith(nextText)) return true;
  const common = commonPrefixLength(nextText, currentText);
  return common >= 12 && common / Math.min(nextText.length, currentText.length) >= 0.6;
}

function commonPrefixLength(a: string, b: string): number {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) index += 1;
  return index;
}
