import type { AppError } from "./result.js";

export interface HumanStatus {
  cdpReachable: boolean;
  teamsTabFound: boolean;
  meetingActive: boolean;
  cdpEndpoint?: string;
}

export function renderHumanStatus(status: HumanStatus): string {
  const lines = [
    "Teams transcript status",
    `CDP reachable: ${yesNo(status.cdpReachable)}`,
    `Teams tab found: ${yesNo(status.teamsTabFound)}`,
    `Meeting active: ${yesNo(status.meetingActive)}`,
  ];
  if (status.cdpEndpoint) lines.splice(1, 0, `CDP endpoint: ${status.cdpEndpoint}`);
  return `${lines.join("\n")}\n`;
}

export function renderHumanError(error: AppError): string {
  return `${error.message}\n`;
}

function yesNo(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}
