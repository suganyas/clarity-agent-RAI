export function renderHelp(): string {
  return `teams-transcript

Usage:
  teams-transcript status [--json] [--cdp-endpoint <url>]
  teams-transcript stream [--json] [--cdp-endpoint <url>] [--idle-timeout-ms <number>] [--max-duration-ms <number>] [--out <path>] [--watch-events]

Options:
  --json                  Render machine-readable output.
  --cdp-endpoint <url>    Edge CDP endpoint. Defaults to TEAMS_CDP_ENDPOINT or http://127.0.0.1:9222.
  --idle-timeout-ms <n>   Stream idle timeout. Defaults to 30000.
  --max-duration-ms <n>   Optional maximum stream duration.
  --out <path>            Write stream output to a file and print the save path to stderr.
  --watch-events          With --json --out, print event names to stdout while writing NDJSON to the file.
  -h, --help              Show this help.`;
}
