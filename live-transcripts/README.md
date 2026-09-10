First thing: run this skill:

```text
/setup-live-transcripts
```

# Teams Live Transcript CLI

Local CLI for attaching to an already-running Microsoft Teams meeting in a CDP-controlled Edge or Chrome browser and streaming live transcript/caption text when Teams exposes it in the browser page.

## Reference

The skill walks you through choosing Edge or Chrome, choosing the right browser profile, launching the browser with CDP, joining the call, turning on live captions, running the recorder in a new terminal, and validating NDJSON output. Safari will not work because this CLI requires Chrome DevTools Protocol. The rest of this README is reference information for the agent and for manual troubleshooting.

The CLI is intentionally local-first:

- It uses your existing signed-in Edge or Chrome session.
- It requires Edge or Chrome to be launched with a local Chrome DevTools Protocol (CDP) endpoint.
- It does not launch or re-launch the browser for you.
- It does not persist Teams tokens, cookies, raw network frames, or transcript content by default.

## Command tree

```text
teams-transcript
├── --help
├── status
│   ├── --json
│   └── --cdp-endpoint <url>
└── stream
    ├── --json
    ├── --cdp-endpoint <url>
    ├── --idle-timeout-ms <number>
    ├── --max-duration-ms <number>
    ├── --out <path>
    └── --watch-events
```

Convenience recipes:

```text
just
├── boot
├── check
├── interact
├── observe
├── test
├── build
├── stream-transcript [idle_timeout=10000]
├── record-transcript [out=""] [idle_timeout=10000]
├── record-transcript-watch [out=""] [idle_timeout=10000]
└── dump-raw-captions [duration_ms=30000]
```

During development, run commands through npm:

```bash
npm run --silent cli -- <command> [options]
```

Use `npm run --silent` for JSON/NDJSON output. Plain `npm run` prints npm's script banner to stdout and breaks machine parsing.

## Setup

Prerequisites:

- Microsoft Edge or Google Chrome installed. Safari is not supported because it does not expose the required CDP endpoint.
- Node.js and npm.
- [`just`](https://github.com/casey/just) for the convenience recipes.

Install dependencies and run the validation suite from the repository root:

```bash
cd <repo-root>
npm install
just check
```

Expected result: TypeScript builds and all tests pass.

First-time flow:

```bash
just check
# Launch Edge or Chrome with --remote-debugging-port=9222 using one of the platform examples below.
npm run --silent cli -- status
just stream-transcript 30000
```

## Launch a CDP browser for Teams

The CLI attaches to Edge or Chrome through a local Chrome DevTools Protocol endpoint. The browser must be started with `--remote-debugging-port=9222`; opening a normal browser window first is not enough. Safari will not work for this CLI.

Edge is the default. Chrome also works if that is where you normally sign in to Teams. If the selected browser is already running without CDP, fully quit it first, then start it with CDP. Use the command for your platform.

macOS:

```bash
open -a "/Applications/Microsoft Edge.app" --args \
  --remote-debugging-port=9222 \
  --profile-directory=Default \
  "https://teams.cloud.microsoft/"
```

Windows PowerShell:

```powershell
Start-Process msedge -ArgumentList '--remote-debugging-port=9222', '--profile-directory=Default', 'https://teams.cloud.microsoft/'
```

Linux:

```bash
microsoft-edge \
  --remote-debugging-port=9222 \
  --profile-directory=Default \
  "https://teams.cloud.microsoft/"
```

Chrome equivalents:

```text
macOS app name: /Applications/Google Chrome.app
Windows executable: chrome
Linux executable: google-chrome
```

Join the Teams meeting in the browser window launched with CDP.

If you do not want to reuse your normal Edge profile, launch with a temporary user data directory instead of `--profile-directory=Default`:

macOS:

```bash
open -a "/Applications/Microsoft Edge.app" --args \
  --remote-debugging-port=9222 \
  --user-data-dir="$PWD/scratch/edge-cdp-profile" \
  "https://teams.cloud.microsoft/"
```

Windows PowerShell:

```powershell
Start-Process msedge -ArgumentList '--remote-debugging-port=9222', "--user-data-dir=$PWD\scratch\edge-cdp-profile", 'https://teams.cloud.microsoft/'
```

Linux:

```bash
microsoft-edge \
  --remote-debugging-port=9222 \
  --user-data-dir="$PWD/scratch/edge-cdp-profile" \
  "https://teams.cloud.microsoft/"
```

For Chrome, use the Chrome executable/app name above and a Chrome-specific profile directory such as `scratch/chrome-cdp-profile`.

Sign in to Teams in that window before running `status` or `stream`.

The default CDP endpoint is:

```text
http://127.0.0.1:9222
```

Endpoint precedence:

1. `--cdp-endpoint <url>`
2. `TEAMS_CDP_ENDPOINT`
3. `http://127.0.0.1:9222`

## Check the meeting connection

Human output:

```bash
npm run --silent cli -- status
```

JSON output:

```bash
npm run --silent cli -- status --json
```

Healthy status means:

- CDP is reachable.
- A Teams tab was found.
- Meeting controls are visible enough to identify an active call.

Common failures:

| Error | Meaning | Fix |
|-------|---------|-----|
| `CDP_UNREACHABLE` | The selected browser was not launched with CDP, the port is wrong, or the browser is closed. | Relaunch Edge or Chrome with `--remote-debugging-port=9222`. |
| `TEAMS_TAB_MISSING` | CDP works, but no Teams tab was found. | Open `https://teams.cloud.microsoft/` in the CDP-enabled browser session. |
| `Meeting active: no` | Teams is open, but meeting controls were not detected. | Join the meeting and enable captions/transcription if available. |

## Stream live transcript text

Human output:

```bash
npm run --silent cli -- stream --idle-timeout-ms 10000
```

Or use the just recipe:

```bash
just stream-transcript
```

Optionally override the initial transcript wait timeout:

```bash
just stream-transcript 30000
```

JSON/NDJSON output:

```bash
npm run --silent cli -- stream --json --idle-timeout-ms 10000
```

`stream --json` emits newline-delimited JSON: one event per line.

Example event categories:

```json
{"event":"transcript","sequence":1}
{"event":"end","sequence":2}
```

Human transcript formatting prints speaker names on their own line and separates messages with blank lines:

```text
Jacob Zhou (ISE)
between the team members to get an idea of what the scope is.

they used MCP stuff
```

In human `stream` mode, the CLI rewrites the current caption line in place as Teams grows the caption. Set `TEAMS_TRANSCRIPT_PLAIN=1` to disable terminal control codes and write plain transcript text.

The stream keeps polling until:

- `Ctrl-C` is pressed.
- `--idle-timeout-ms` elapses before the first transcript text is detected.
- `--max-duration-ms` is reached, if provided.
- Teams/browser/CDP becomes unavailable.

Use `Ctrl-C` to stop a stream. The CLI forwards the interrupt to the active probe and closes CDP resources.

After the first transcript event, the stream stays alive by default. Use `Ctrl-C` to stop recording, or provide `--max-duration-ms` when you want a bounded capture.

## Record transcripts to a file

The CLI does **not** record to disk by default. If you choose to record, redirect output explicitly.

Human-readable transcript:

```bash
npm run --silent cli -- stream --idle-timeout-ms 30000 > transcript.txt
```

NDJSON transcript events:

```bash
npm run --silent cli -- stream --json --idle-timeout-ms 30000 > transcript.ndjson
```

Just shortcut:

```bash
just record-transcript
```

By default this creates the next ordinal file:

```text
scratch/001-transcript.ndjson
scratch/002-transcript.ndjson
...
```

Custom output file and initial wait:

```bash
just record-transcript scratch/my-meeting.ndjson 30000
```

Record to file while watching event categories live:

```bash
just record-transcript-watch
```

Stop recording with `Ctrl-C`.

To inspect NDJSON without printing transcript text, summarize event categories:

```bash
npm run --silent cli -- stream --json --idle-timeout-ms 10000 \
  | node -e 'const readline=require("node:readline"); const counts={}; readline.createInterface({input:process.stdin}).on("line", l => { const e=JSON.parse(l).event; counts[e]=(counts[e]||0)+1; }).on("close", () => console.log(counts));'
```

## Output contracts

### `status --json`

Emits one JSON result envelope:

```json
{
  "schemaVersion": 1,
  "ok": true,
  "command": "status",
  "data": {
    "cdpReachable": true,
    "teamsTabFound": true,
    "meetingActive": true
  },
  "meta": {
    "timestamp": "2026-05-29T00:00:00.000Z"
  }
}
```

### `stream --json`

Emits NDJSON. Required fields:

| Field | Description |
|-------|-------------|
| `schemaVersion` | Output schema version. Starts at `1`. |
| `event` | `status`, `transcript`, `partial`, `correction`, `unavailable`, `error`, or `end`. |
| `sequence` | Monotonic sequence number per process. |
| `timestamp` | CLI observation timestamp. |
| `source` | `dom`, `network`, `websocket`, `teams-state`, or `unknown`. |

Text events include `text` and may include `speaker`. `unavailable` and `error` events include `reason`.

If no transcript/caption source is detected, `stream` reports `unavailable` and exits with code `20`.

## Validation commands

Run deterministic project checks:

```bash
just boot
just check
just interact
just observe
```

Run live-safe status checks:

```bash
npm run --silent cli -- status
npm run --silent cli -- status --json
```

Run a short live stream check:

```bash
npm run --silent cli -- stream --json --idle-timeout-ms 3000 --max-duration-ms 5000
```

For privacy-safe validation, avoid printing or saving transcript text. Prefer event-category summaries unless you explicitly want to record content.

## Debugging transcript output

When transcript output looks wrong, capture raw caption DOM structure before changing selectors or formatting:

```bash
just dump-raw-captions 30000
```

This writes `scratch/raw-captions.ndjson`. The `scratch/` directory is gitignored.

Use the dump to validate assumptions about Teams' DOM:

- Which nodes contain live caption text.
- Whether a selector is grabbing wrapper history instead of leaf text.
- Where speaker labels are stored relative to caption text.

If `just record-transcript-watch` only prints event names like `transcript` or `correction`, that is expected: the full NDJSON is saved to the file printed by `saving transcript to ...`. Use the debug runbook for privacy-safe summaries before changing code.
- Whether Teams is sending progressive caption rewrites or new utterances.

Current known Teams structure:

- Live caption text is in visible `span[data-tid="closed-caption-text"]` leaf nodes.
- Broad caption wrappers can contain long concatenated caption history and should not be used as the transcript source.
- Speaker labels can appear as sibling elements immediately before the caption text inside the caption row.

## Limitations

- v1 uses a DOM-first probe. It works when Teams exposes caption/transcript text in the page DOM.
- It does not yet decode the underlying Teams WebSocket transcript protocol.
- Teams UI changes can break transcript detection.
- Tenant policy or meeting settings may disable captions/transcription.
- The CLI attaches only to an already-running Edge or Chrome CDP session.

## More docs

- [Launching a browser with CDP](docs/how/edge-cdp.md)
- [Live transcript stream usage](docs/how/live-transcript.md)
- [Debug live caption capture](docs/how/debug-live-captions.md)
- [Manual validation runbook](docs/how/manual-validation.md)
