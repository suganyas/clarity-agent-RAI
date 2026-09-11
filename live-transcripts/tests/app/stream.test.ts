import { describe, expect, it } from "vitest";
import { runStream } from "../../src/app/commands/stream.js";
import type { TranscriptObservation, TranscriptSource } from "../../src/ports/transcript-source.js";

describe("runStream", () => {
  it("renders NDJSON transcript and end events", async () => {
    const result = await runStream(sourceFrom([{ kind: "transcript", text: "Hello", source: "dom" }]), {
      command: "stream",
      output: "json",
      idleTimeoutMs: 1000,
    });

    expect(result.exitCode).toBe(0);
    const lines = result.stdout?.trim().split("\n").map((line) => JSON.parse(line));
    expect(lines).toMatchObject([
      { event: "transcript", sequence: 1, text: "Hello" },
      { event: "end", sequence: 2 },
    ]);
  });

  it("returns canonical unavailable exit code and event", async () => {
    const result = await runStream(
      sourceFrom([{ kind: "unavailable", reason: "no transcript source detected", source: "unknown" }]),
      {
        command: "stream",
        output: "json",
        idleTimeoutMs: 1000,
      },
    );

    expect(result.exitCode).toBe(20);
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      event: "unavailable",
      reason: "no transcript source detected",
    });
  });

  it("renders human transcript text", async () => {
    const result = await runStream(sourceFrom([{ kind: "transcript", text: "Hello", speaker: "Alex", source: "dom" }]), {
      command: "stream",
      output: "human",
      idleTimeoutMs: 1000,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Alex\nHello");
  });

  it("separates consecutive human transcript messages with blank lines", async () => {
    const result = await runStream(
      sourceFrom([
        { kind: "transcript", text: "First message", speaker: "Jacob Zhou (ISE)", source: "dom" },
        { kind: "transcript", text: "they used MCP stuff", source: "dom" },
      ]),
      {
        command: "stream",
        output: "human",
        idleTimeoutMs: 1000,
      },
    );

    expect(result.stdout).toBe("Jacob Zhou (ISE)\nFirst message\n\nthey used MCP stuff\n");
  });

  it("does not repeat the speaker label when the speaker is unchanged", async () => {
    const result = await runStream(
      sourceFrom([
        { kind: "transcript", text: "First message", speaker: "Alex", source: "dom" },
        { kind: "transcript", text: "Second message", speaker: "Alex", source: "dom" },
      ]),
      {
        command: "stream",
        output: "human",
        idleTimeoutMs: 1000,
      },
    );

    expect(result.stdout).toBe("Alex\nFirst message\n\nSecond message\n");
  });

  it("renders partial deltas inline instead of repeating whole messages", async () => {
    const result = await runStream(
      sourceFrom([
        { kind: "transcript", text: "To keep up with", speaker: "Alex", source: "dom" },
        { kind: "partial", text: " the project", speaker: "Alex", source: "dom" },
        { kind: "partial", text: ", right?", speaker: "Alex", source: "dom" },
      ]),
      {
        command: "stream",
        output: "human",
        idleTimeoutMs: 1000,
      },
    );

    expect(result.stdout).toBe("Alex\nTo keep up with the project, right?\n");
  });

  it("can render partial deltas as in-place TUI updates", async () => {
    const chunks: string[] = [];
    const result = await runStream(
      sourceFrom([
        { kind: "transcript", text: "Right", source: "dom" },
        { kind: "partial", text: ", based on the meetings", source: "dom" },
      ]),
      {
        command: "stream",
        output: "human",
        idleTimeoutMs: 1000,
        useTui: true,
        onStdout: (chunk) => chunks.push(chunk),
      },
    );

    expect(result.exitCode).toBe(0);
    expect(chunks.join("")).toContain("\r\u001b[2KRight");
    expect(chunks.join("")).toContain("\r\u001b[2KRight, based on the meetings");
  });

  it("updates in place when growing captions arrive as transcript rewrites", async () => {
    const chunks: string[] = [];
    const result = await runStream(
      sourceFrom([
        { kind: "transcript", text: "So I had to stage them", source: "dom" },
        { kind: "transcript", text: "So I had to stage them in my environment", source: "dom" },
        { kind: "transcript", text: "So I had to stage them in my environment, update them based on what I generate", source: "dom" },
      ]),
      {
        command: "stream",
        output: "human",
        idleTimeoutMs: 1000,
        useTui: true,
        onStdout: (chunk) => chunks.push(chunk),
      },
    );

    expect(result.exitCode).toBe(0);
    expect(chunks.join("")).toContain("\r\u001b[2KSo I had to stage them");
    expect(chunks.join("")).toContain(
      "\r\u001b[2KSo I had to stage them in my environment, update them based on what I generate",
    );
    expect(chunks.join("")).not.toContain("\n\nSo I had to stage them in my environment");
  });

  it("does not duplicate growing captions when speaker metadata changes", async () => {
    const result = await runStream(
      sourceFrom([
        { kind: "transcript", text: "What you cannot do is get the transcript", speaker: "Speaker A", source: "dom" },
        { kind: "partial", text: " or get the summaries", speaker: "Speaker B", source: "dom" },
        { kind: "partial", text: " or get details", speaker: "Speaker A", source: "dom" },
      ]),
      {
        command: "stream",
        output: "human",
        idleTimeoutMs: 1000,
      },
    );

    expect(result.stdout).toBe(
      "Speaker A\nWhat you cannot do is get the transcript or get the summaries or get details\n",
    );
  });
});

function sourceFrom(observations: TranscriptObservation[]): TranscriptSource {
  return {
    async *observe() {
      for (const observation of observations) {
        yield observation;
      }
    },
  };
}
