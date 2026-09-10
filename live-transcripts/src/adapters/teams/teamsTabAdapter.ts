import type { Page } from "playwright-core";
import type { TeamsSessionStatus } from "../../domain/teams-session/types.js";
import type { TeamsSessionPort } from "../../ports/teams-session.js";
import { EdgeCdpClient } from "../edge-cdp/edgeCdpClient.js";
import { createRedactedDiagnostic } from "../security/diagnostics.js";

export interface TeamsTabAdapterOptions {
  cdpEndpoint: string;
  cdpEndpointSource: "default" | "env" | "flag";
}

export class TeamsTabAdapter implements TeamsSessionPort {
  constructor(private readonly options: TeamsTabAdapterOptions) {}

  async getStatus(): Promise<TeamsSessionStatus> {
    const connection = await new EdgeCdpClient(this.options.cdpEndpoint).connect();
    if (connection.pages.length === 0) {
      await connection.close();
      const status: TeamsSessionStatus = {
        cdpReachable: false,
        teamsTabFound: false,
        meetingActive: false,
        cdpEndpoint: this.options.cdpEndpoint,
        cdpEndpointSource: this.options.cdpEndpointSource,
      };
      if (connection.diagnostics) {
        status.diagnostics = { diagnostic: connection.diagnostics };
      }
      return {
        ...status,
      };
    }

    const teamsPage = await findTeamsPage(connection.pages);
    if (!teamsPage) {
      await connection.close();
      return {
        cdpReachable: true,
        teamsTabFound: false,
        meetingActive: false,
        cdpEndpoint: this.options.cdpEndpoint,
        cdpEndpointSource: this.options.cdpEndpointSource,
        diagnostics: { diagnostic: createRedactedDiagnostic("teams-tab-missing", {
          pageCount: connection.pages.length,
        }) },
      };
    }

    const title = await safeTitle(teamsPage);
    const meetingActive = await detectMeetingActive(teamsPage);
    const url = teamsPage.url();
    await connection.close();
    return {
      cdpReachable: true,
      teamsTabFound: true,
      meetingActive,
      cdpEndpoint: this.options.cdpEndpoint,
      cdpEndpointSource: this.options.cdpEndpointSource,
      tabTitle: title,
      tabUrl: url,
      diagnostics: { diagnostic: createRedactedDiagnostic("teams-tab-detected", {
        title,
        url,
        meetingActive,
      }) },
    };
  }
}

async function findTeamsPage(pages: readonly Page[]): Promise<Page | undefined> {
  for (const page of pages) {
    const title = await safeTitle(page);
    const url = page.url();
    if (/teams/i.test(title) || /teams/i.test(url)) return page;
  }
  return undefined;
}

async function detectMeetingActive(page: Page): Promise<boolean> {
  return page
    .evaluate(() => {
      const text = document.body?.innerText ?? "";
      return /\b(leave|hang up|microphone|camera|participants|people|share)\b/i.test(text);
    })
    .catch(() => false);
}

async function safeTitle(page: Page): Promise<string> {
  return page.title().catch(() => "");
}
