export type CommandName = "help" | "status" | "stream";
export type OutputMode = "human" | "json";
export type CdpEndpointSource = "default" | "env" | "flag";

export type ParsedArgs =
  | {
      command: "help";
      output: OutputMode;
    }
  | {
      command: "status";
      output: OutputMode;
      cdpEndpoint: string;
      cdpEndpointSource: CdpEndpointSource;
    }
  | {
      command: "stream";
      output: OutputMode;
      cdpEndpoint: string;
      cdpEndpointSource: CdpEndpointSource;
      idleTimeoutMs: number;
      maxDurationMs?: number;
      outFile?: string;
      watchEvents: boolean;
    };

export interface CliArgError {
  code: "INVALID_COMMAND" | "INVALID_ARGUMENT";
  message: string;
  exitCode: number;
}

export type ParseResult =
  | { ok: true; value: ParsedArgs }
  | { ok: false; error: CliArgError };

type ParseErrorResult = Extract<ParseResult, { ok: false }>;
type OptionResult = { ok: true; value: string | undefined } | ParseErrorResult;
type IntegerOptionResult = { ok: true; value: number | undefined } | ParseErrorResult;
type CdpEndpointResult =
  | { ok: true; value: { endpoint: string; source: CdpEndpointSource } }
  | ParseErrorResult;

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;

export function parseArgs(argv: readonly string[], env: NodeJS.ProcessEnv): ParseResult {
  const tokens = [...argv];
  const output: OutputMode = consumeFlag(tokens, "--json") ? "json" : "human";

  if (tokens.length === 0 || consumeFlag(tokens, "--help") || consumeFlag(tokens, "-h")) {
    return { ok: true, value: { command: "help", output } };
  }

  const command = tokens.shift();
  if (command !== "status" && command !== "stream") {
    return invalid("INVALID_COMMAND", `Unknown command: ${command ?? ""}`);
  }

  const endpointResult = readCdpEndpoint(tokens, env);
  if (!endpointResult.ok) return endpointResult;

  if (command === "status") {
    const unexpected = firstUnexpected(tokens);
    if (unexpected) return invalid("INVALID_ARGUMENT", `Unexpected argument: ${unexpected}`);
    return {
      ok: true,
      value: {
        command,
        output,
        cdpEndpoint: endpointResult.value.endpoint,
        cdpEndpointSource: endpointResult.value.source,
      },
    };
  }

  const idleResult = readPositiveIntegerOption(tokens, "--idle-timeout-ms", DEFAULT_IDLE_TIMEOUT_MS);
  if (!idleResult.ok) return idleResult;
  const maxDurationResult = readPositiveIntegerOption(tokens, "--max-duration-ms");
  if (!maxDurationResult.ok) return maxDurationResult;
  const outResult = consumeOption(tokens, "--out");
  if (!outResult.ok) return outResult;
  const watchEvents = consumeFlag(tokens, "--watch-events");
  if (watchEvents && output !== "json") {
    return invalid("INVALID_ARGUMENT", "--watch-events requires --json");
  }
  if (watchEvents && outResult.value === undefined) {
    return invalid("INVALID_ARGUMENT", "--watch-events requires --out");
  }
  const unexpected = firstUnexpected(tokens);
  if (unexpected) return invalid("INVALID_ARGUMENT", `Unexpected argument: ${unexpected}`);

  const value: Extract<ParsedArgs, { command: "stream" }> = {
    command,
    output,
    cdpEndpoint: endpointResult.value.endpoint,
    cdpEndpointSource: endpointResult.value.source,
    idleTimeoutMs: idleResult.value ?? DEFAULT_IDLE_TIMEOUT_MS,
    watchEvents,
  };
  if (maxDurationResult.value !== undefined) {
    value.maxDurationMs = maxDurationResult.value;
  }
  if (outResult.value !== undefined) {
    value.outFile = outResult.value;
  }
  return { ok: true, value };
}

function consumeFlag(tokens: string[], flag: string): boolean {
  const index = tokens.indexOf(flag);
  if (index === -1) return false;
  tokens.splice(index, 1);
  return true;
}

function readCdpEndpoint(
  tokens: string[],
  env: NodeJS.ProcessEnv,
): CdpEndpointResult {
  const flagValue = consumeOption(tokens, "--cdp-endpoint");
  if (!flagValue.ok) return flagValue;
  if (flagValue.value !== undefined) {
    return { ok: true, value: { endpoint: flagValue.value, source: "flag" } };
  }
  if (env.TEAMS_CDP_ENDPOINT) {
    return { ok: true, value: { endpoint: env.TEAMS_CDP_ENDPOINT, source: "env" } };
  }
  return { ok: true, value: { endpoint: DEFAULT_CDP_ENDPOINT, source: "default" } };
}

function readPositiveIntegerOption(
  tokens: string[],
  option: string,
  defaultValue?: number,
): IntegerOptionResult {
  const optionValue = consumeOption(tokens, option);
  if (!optionValue.ok) return optionValue;
  if (optionValue.value === undefined) {
    return { ok: true, value: defaultValue };
  }
  const parsed = Number(optionValue.value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return invalid("INVALID_ARGUMENT", `${option} must be a positive integer`);
  }
  return { ok: true, value: parsed };
}

function consumeOption(tokens: string[], option: string): OptionResult {
  const index = tokens.indexOf(option);
  if (index === -1) return { ok: true, value: undefined };
  const value = tokens[index + 1];
  if (!value || value.startsWith("--")) {
    return invalid("INVALID_ARGUMENT", `${option} requires a value`);
  }
  tokens.splice(index, 2);
  return { ok: true, value };
}

function firstUnexpected(tokens: readonly string[]): string | undefined {
  return tokens[0];
}

function invalid(code: CliArgError["code"], message: string): ParseErrorResult {
  return { ok: false, error: { code, message, exitCode: 2 } };
}
