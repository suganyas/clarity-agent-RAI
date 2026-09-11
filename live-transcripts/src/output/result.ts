export const SCHEMA_VERSION = 1;

export interface AppError {
  code: string;
  message: string;
  exitCode: number;
  details?: Record<string, unknown>;
}

export interface ResultMeta {
  timestamp: string;
  cdpEndpoint?: string;
  [key: string]: unknown;
}

export type ResultEnvelope<TData = unknown> =
  | {
      schemaVersion: 1;
      ok: true;
      command: string;
      data: TData;
      meta: ResultMeta;
    }
  | {
      schemaVersion: 1;
      ok: false;
      command: string;
      error: Omit<AppError, "exitCode">;
      meta: ResultMeta;
    };

export type StreamEventName = "status" | "transcript" | "partial" | "correction" | "unavailable" | "error" | "end";
export type StreamEventSource = "dom" | "network" | "websocket" | "teams-state" | "unknown";

export interface StreamEvent {
  schemaVersion: 1;
  event: StreamEventName;
  sequence: number;
  timestamp: string;
  source: StreamEventSource;
  text?: string;
  speaker?: string;
  reason?: string;
  diagnostics?: Record<string, unknown>;
}

export function okEnvelope<TData>(
  command: string,
  data: TData,
  meta: Partial<ResultMeta> = {},
): ResultEnvelope<TData> {
  return {
    schemaVersion: SCHEMA_VERSION,
    ok: true,
    command,
    data,
    meta: withTimestamp(meta),
  };
}

export function errorEnvelope(command: string, error: AppError, meta: Partial<ResultMeta> = {}): ResultEnvelope {
  const { exitCode: _exitCode, ...renderableError } = error;
  return {
    schemaVersion: SCHEMA_VERSION,
    ok: false,
    command,
    error: renderableError,
    meta: withTimestamp(meta),
  };
}

function withTimestamp(meta: Partial<ResultMeta>): ResultMeta {
  return {
    timestamp: typeof meta.timestamp === "string" ? meta.timestamp : new Date().toISOString(),
    ...meta,
  };
}
