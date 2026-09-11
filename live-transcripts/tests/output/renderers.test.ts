import { describe, expect, it } from "vitest";
import { renderHumanError, renderHumanStatus } from "../../src/output/human.js";
import { renderJsonResult, renderNdjsonEvent } from "../../src/output/json.js";
import { errorEnvelope, okEnvelope } from "../../src/output/result.js";

describe("output renderers", () => {
  it("renders JSON result envelopes without human prose", () => {
    const rendered = renderJsonResult(
      okEnvelope("status", { cdpReachable: true }, { cdpEndpoint: "http://127.0.0.1:9222" }),
    );

    expect(JSON.parse(rendered)).toMatchObject({
      schemaVersion: 1,
      ok: true,
      command: "status",
      data: { cdpReachable: true },
      meta: { cdpEndpoint: "http://127.0.0.1:9222" },
    });
  });

  it("renders structured JSON errors", () => {
    const rendered = renderJsonResult(
      errorEnvelope("status", {
        code: "CDP_UNREACHABLE",
        message: "Edge CDP endpoint is not reachable",
        exitCode: 10,
      }),
    );

    expect(JSON.parse(rendered)).toMatchObject({
      schemaVersion: 1,
      ok: false,
      command: "status",
      error: { code: "CDP_UNREACHABLE", message: "Edge CDP endpoint is not reachable" },
    });
  });

  it("renders NDJSON events as exactly one line", () => {
    const rendered = renderNdjsonEvent({
      schemaVersion: 1,
      event: "unavailable",
      sequence: 1,
      timestamp: "2026-05-29T00:00:00.000Z",
      source: "unknown",
      reason: "no transcript source detected",
    });

    expect(rendered.endsWith("\n")).toBe(true);
    expect(rendered.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(rendered)).toMatchObject({ event: "unavailable", sequence: 1 });
  });

  it("renders human status and errors separately from JSON contracts", () => {
    expect(renderHumanStatus({ cdpReachable: true, teamsTabFound: true, meetingActive: false })).toContain(
      "Meeting active: no",
    );
    expect(
      renderHumanError({
        code: "TEAMS_TAB_MISSING",
        message: "No Teams tab found",
        exitCode: 11,
      }),
    ).toBe("No Teams tab found\n");
  });
});
