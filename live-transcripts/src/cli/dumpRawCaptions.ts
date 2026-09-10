#!/usr/bin/env node

import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

interface Options {
  cdpEndpoint: string;
  durationMs: number;
  out: string;
}

const options = parseOptions(process.argv.slice(2));
await mkdir(dirname(options.out), { recursive: true });

const browser = await chromium.connectOverCDP(options.cdpEndpoint);
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const page = await findTeamsPage(pages);
  if (!page) {
    throw new Error("No Teams tab found over CDP");
  }

  const startedAt = Date.now();
  const rows: unknown[] = [];
  while (Date.now() - startedAt < options.durationMs) {
    rows.push({
      at: new Date().toISOString(),
      url: page.url(),
      title: await page.title().catch(() => ""),
      candidates: await dumpCaptionCandidates(page),
    });
    await sleep(500);
  }

  await writeFile(options.out, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  console.error(`wrote ${rows.length} samples to ${options.out}`);
} finally {
  await browser.close();
}

function parseOptions(argv: string[]): Options {
  return {
    cdpEndpoint: readOption(argv, "--cdp-endpoint") ?? process.env.TEAMS_CDP_ENDPOINT ?? "http://127.0.0.1:9222",
    durationMs: Number(readOption(argv, "--duration-ms") ?? "30000"),
    out: readOption(argv, "--out") ?? "scratch/raw-captions.ndjson",
  };
}

function readOption(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

async function findTeamsPage(pages: readonly import("playwright-core").Page[]) {
  for (const page of pages) {
    const title = await page.title().catch(() => "");
    if (/teams/i.test(title) || /teams/i.test(page.url())) return page;
  }
  return undefined;
}

async function dumpCaptionCandidates(page: import("playwright-core").Page) {
  return page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll('[data-tid*="caption" i], [aria-label*="caption" i], [class*="caption" i]'),
    );
    return nodes.map((node, index) => {
      const element = node as Element;
      const rect = element.getBoundingClientRect();
      const parent = element.parentElement;
      return {
        index,
        tag: element.tagName.toLowerCase(),
        text: (element.textContent ?? "").trim(),
        ariaLabel: element.getAttribute("aria-label"),
        title: element.getAttribute("title"),
        className: element.getAttribute("class"),
        dataTid: element.getAttribute("data-tid"),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        parentTag: parent?.tagName.toLowerCase(),
        parentText: (parent?.textContent ?? "").trim(),
        childCount: element.children.length,
      };
    });
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
