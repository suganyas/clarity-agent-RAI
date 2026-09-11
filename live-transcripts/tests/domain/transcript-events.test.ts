import { describe, expect, it } from "vitest";
import { normalizeTranscriptObservation } from "../../src/domain/transcript-stream/normalize.js";

describe("normalizeTranscriptObservation", () => {
  it("normalizes transcript observations into schema-versioned stream events", () => {
    expect(
      normalizeTranscriptObservation(
        {
          kind: "transcript",
          text: "Hello team",
          speaker: "Jordan",
          source: "dom",
          observedAt: "2026-05-29T00:00:00.000Z",
        },
        7,
      ),
    ).toEqual({
      schemaVersion: 1,
      event: "transcript",
      sequence: 7,
      timestamp: "2026-05-29T00:00:00.000Z",
      source: "dom",
      text: "Hello team",
      speaker: "Jordan",
    });
  });

  it("normalizes unavailable observations with a reason", () => {
    expect(
      normalizeTranscriptObservation(
        {
          kind: "unavailable",
          reason: "no caption source",
          source: "unknown",
          observedAt: "2026-05-29T00:00:00.000Z",
        },
        1,
      ),
    ).toMatchObject({
      event: "unavailable",
      reason: "no caption source",
      sequence: 1,
    });
  });
});
