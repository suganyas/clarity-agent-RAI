import { chromium, type Browser, type Page } from "playwright-core";
import { createRedactedDiagnostic, type RedactedDiagnostic } from "../security/diagnostics.js";

export interface EdgeCdpConnection {
  browser: Browser;
  pages: Page[];
  diagnostics?: RedactedDiagnostic;
  close(): Promise<void>;
}

export class EdgeCdpClient {
  constructor(private readonly endpoint: string) {}

  async connect(): Promise<EdgeCdpConnection> {
    try {
      const browser = await chromium.connectOverCDP(this.endpoint);
      const pages = browser.contexts().flatMap((context) => context.pages());
      return {
        browser,
        pages,
        diagnostics: createRedactedDiagnostic("edge-cdp-connect", {
          endpoint: this.endpoint,
          pageCount: pages.length,
        }),
        async close() {
          await browser.close();
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        browser: undefined as never,
        pages: [],
        diagnostics: createRedactedDiagnostic("edge-cdp-connect-failed", {
          endpoint: this.endpoint,
          error: message,
        }),
        async close() {
          return undefined;
        },
      };
    }
  }
}
