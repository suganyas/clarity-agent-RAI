import { describe, expect, it } from "vitest";
import { parseArgs } from "../../src/cli/args.js";

describe("parseArgs", () => {
  it("defaults to help in human mode", () => {
    expect(parseArgs([], {})).toMatchObject({
      ok: true,
      value: { command: "help", output: "human" },
    });
  });

  it("parses status with json and default CDP endpoint", () => {
    expect(parseArgs(["status", "--json"], {})).toEqual({
      ok: true,
      value: {
        command: "status",
        output: "json",
        cdpEndpoint: "http://127.0.0.1:9222",
        cdpEndpointSource: "default",
      },
    });
  });

  it("parses stream lifecycle flags and explicit endpoint", () => {
    expect(
      parseArgs(
        [
          "stream",
          "--cdp-endpoint",
          "http://localhost:9333",
          "--idle-timeout-ms",
          "1000",
          "--max-duration-ms",
          "5000",
        ],
        { TEAMS_CDP_ENDPOINT: "http://ignored:9222" },
      ),
    ).toEqual({
      ok: true,
      value: {
        command: "stream",
        output: "human",
        cdpEndpoint: "http://localhost:9333",
        cdpEndpointSource: "flag",
        idleTimeoutMs: 1000,
        maxDurationMs: 5000,
        watchEvents: false,
      },
    });
  });

  it("parses stream output file and watched event flags", () => {
    expect(parseArgs(["stream", "--json", "--out", "scratch/001-transcript.ndjson", "--watch-events"], {})).toEqual({
      ok: true,
      value: {
        command: "stream",
        output: "json",
        cdpEndpoint: "http://127.0.0.1:9222",
        cdpEndpointSource: "default",
        idleTimeoutMs: 30000,
        outFile: "scratch/001-transcript.ndjson",
        watchEvents: true,
      },
    });
  });

  it("uses TEAMS_CDP_ENDPOINT when no flag is provided", () => {
    expect(parseArgs(["status"], { TEAMS_CDP_ENDPOINT: "http://edge:9222" })).toMatchObject({
      ok: true,
      value: {
        command: "status",
        cdpEndpoint: "http://edge:9222",
        cdpEndpointSource: "env",
      },
    });
  });

  it("rejects unknown commands", () => {
    expect(parseArgs(["wat"], {})).toEqual({
      ok: false,
      error: {
        code: "INVALID_COMMAND",
        message: "Unknown command: wat",
        exitCode: 2,
      },
    });
  });

  it("rejects missing option values", () => {
    expect(parseArgs(["status", "--cdp-endpoint"], {})).toEqual({
      ok: false,
      error: {
        code: "INVALID_ARGUMENT",
        message: "--cdp-endpoint requires a value",
        exitCode: 2,
      },
    });
  });

  it("rejects non-positive numeric flags", () => {
    expect(parseArgs(["stream", "--idle-timeout-ms", "0"], {})).toEqual({
      ok: false,
      error: {
        code: "INVALID_ARGUMENT",
        message: "--idle-timeout-ms must be a positive integer",
        exitCode: 2,
      },
    });
  });

  it("requires --out when watching event names", () => {
    expect(parseArgs(["stream", "--json", "--watch-events"], {})).toEqual({
      ok: false,
      error: {
        code: "INVALID_ARGUMENT",
        message: "--watch-events requires --out",
        exitCode: 2,
      },
    });
  });
});
