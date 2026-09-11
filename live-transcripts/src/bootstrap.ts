import type { ParsedArgs } from "./cli/args.js";
import { runStatus } from "./app/commands/status.js";
import { runStream, type StreamCommandOptions } from "./app/commands/stream.js";
import { TeamsTabAdapter } from "./adapters/teams/teamsTabAdapter.js";
import { TranscriptProbeAdapter } from "./adapters/teams/transcriptProbeAdapter.js";

export interface AppResult {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

export interface App {
  run(args: ParsedArgs): Promise<AppResult>;
}

export interface AppSinks {
  stdout?: (chunk: string) => void;
  stderr?: (chunk: string) => void;
  signal?: AbortSignal;
  useTui?: boolean;
}

export function createApp(sinks: AppSinks = {}): App {
  return {
    async run(args) {
      if (args.command === "status") {
        return runStatus(
          new TeamsTabAdapter({
            cdpEndpoint: args.cdpEndpoint,
            cdpEndpointSource: args.cdpEndpointSource,
          }),
          {
            command: args.command,
            output: args.output,
          },
        );
      }
      if (args.command === "stream") {
        const streamOptions: StreamCommandOptions = {
          command: args.command,
          output: args.output,
          idleTimeoutMs: args.idleTimeoutMs,
        };
        if (sinks.stdout) streamOptions.onStdout = sinks.stdout;
        if (sinks.stderr) streamOptions.onStderr = sinks.stderr;
        if (sinks.signal) streamOptions.signal = sinks.signal;
        if (sinks.useTui) streamOptions.useTui = sinks.useTui;
        if (args.maxDurationMs !== undefined) {
          return runStream(new TranscriptProbeAdapter({ cdpEndpoint: args.cdpEndpoint }), {
            ...streamOptions,
            maxDurationMs: args.maxDurationMs,
          });
        }
        return runStream(new TranscriptProbeAdapter({ cdpEndpoint: args.cdpEndpoint }), streamOptions);
      }
      return { exitCode: 0 };
    },
  };
}
