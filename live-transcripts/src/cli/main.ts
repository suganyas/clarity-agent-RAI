#!/usr/bin/env node

import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { finished } from "node:stream/promises";
import { createApp } from "../bootstrap.js";
import { parseArgs } from "./args.js";
import { renderHelp } from "./help.js";

const parsed = parseArgs(process.argv.slice(2), process.env);
const abortController = new AbortController();

process.once("SIGINT", () => {
  abortController.abort();
});
process.once("SIGTERM", () => {
  abortController.abort();
});

if (!parsed.ok) {
  console.error(parsed.error.message);
  process.exit(parsed.error.exitCode);
}

if (parsed.value.command === "help") {
  console.log(renderHelp());
  process.exit(0);
}

let watchBuffer = "";
const outFile =
  parsed.value.command === "stream" && parsed.value.outFile !== undefined ? parsed.value.outFile : undefined;
const outStream = outFile ? createWriteStream(prepareOutputFile(outFile), { flags: "w" }) : undefined;

if (outFile) {
  process.stderr.write(`saving transcript to ${outFile}\n`);
}

const result = await createApp({
  stdout: (chunk) => {
    if (outStream) {
      outStream.write(chunk);
      if (parsed.value.command === "stream" && parsed.value.watchEvents) {
        writeWatchedEventNames(chunk);
      }
      return;
    }
    process.stdout.write(chunk);
  },
  stderr: (chunk) => process.stderr.write(chunk),
  signal: abortController.signal,
  useTui:
    parsed.value.command === "stream" &&
    parsed.value.output === "human" &&
    process.env.TEAMS_TRANSCRIPT_PLAIN !== "1",
}).run(parsed.value);
if (outStream) {
  outStream.end();
  await finished(outStream);
}
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.exitCode);

function prepareOutputFile(path: string): string {
  mkdirSync(dirname(path), { recursive: true });
  return path;
}

function writeWatchedEventNames(chunk: string): void {
  watchBuffer += chunk;
  const lines = watchBuffer.split("\n");
  watchBuffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.trim()) continue;
    const event = JSON.parse(line) as { event?: unknown };
    process.stdout.write(`${String(event.event)}\n`);
  }
}
