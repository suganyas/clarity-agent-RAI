import type { TeamsSessionStatus } from "../../domain/teams-session/types.js";
import { renderHumanError, renderHumanStatus } from "../../output/human.js";
import { renderJsonResult } from "../../output/json.js";
import { errorEnvelope, okEnvelope, type AppError } from "../../output/result.js";
import type { TeamsSessionPort } from "../../ports/teams-session.js";

export interface StatusCommandOptions {
  command: "status";
  output: "human" | "json";
}

export interface CommandResult {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

export async function runStatus(session: TeamsSessionPort, options: StatusCommandOptions): Promise<CommandResult> {
  const status = await session.getStatus();
  const error = statusError(status);
  if (error) {
    if (options.output === "json") {
      return {
        exitCode: error.exitCode,
        stdout: renderJsonResult(errorEnvelope(options.command, error, statusMeta(status))),
      };
    }
    return {
      exitCode: error.exitCode,
      stderr: renderHumanError(error),
    };
  }

  if (options.output === "json") {
    return {
      exitCode: 0,
      stdout: renderJsonResult(okEnvelope(options.command, status, statusMeta(status))),
    };
  }

  return {
    exitCode: 0,
    stdout: renderHumanStatus(status),
  };
}

function statusError(status: TeamsSessionStatus): AppError | undefined {
  if (!status.cdpReachable) {
    return withOptionalDetails({
      code: "CDP_UNREACHABLE",
      message: "Edge CDP endpoint is not reachable",
      exitCode: 10,
    }, status.diagnostics);
  }
  if (!status.teamsTabFound) {
    return withOptionalDetails({
      code: "TEAMS_TAB_MISSING",
      message: "No Teams tab found",
      exitCode: 11,
    }, status.diagnostics);
  }
  return undefined;
}

function statusMeta(status: TeamsSessionStatus): Record<string, unknown> {
  return {
    cdpEndpoint: status.cdpEndpoint,
    cdpEndpointSource: status.cdpEndpointSource,
    tabTitle: status.tabTitle,
  };
}

function withOptionalDetails(error: AppError, details: Record<string, unknown> | undefined): AppError {
  if (details === undefined) return error;
  return { ...error, details };
}
