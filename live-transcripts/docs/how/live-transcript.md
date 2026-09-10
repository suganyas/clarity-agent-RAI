# Live Transcript Usage

## Human mode

```bash
npm run --silent cli -- stream
```

Shortcut:

```bash
just stream-transcript
```

With a longer initial wait for captions:

```bash
just stream-transcript 30000
```

Human mode prints transcript text when available. If no supported source is detected, it prints an unavailable message and exits with code `20`.

Speaker names are printed on their own line, followed by transcript text and a blank line between messages:

```text
Jacob Zhou (ISE)
between the team members to get an idea of what the scope is.

they used MCP stuff
```

Speaker names are shown only when the speaker changes.

Live captions can arrive as progressive updates. Human stream mode rewrites the current caption line in place until it is superseded by the next caption. Set `TEAMS_TRANSCRIPT_PLAIN=1` to disable terminal control codes and write plain transcript text.

## JSON mode

```bash
npm run --silent cli -- stream --json
```

Record NDJSON to gitignored `scratch/`:

```bash
just record-transcript
```

With no file argument, the recipe writes the next available ordinal file under `scratch/`, such as `scratch/001-transcript.ndjson`.

Record and watch event categories:

```bash
just record-transcript-watch
```

This command intentionally prints event names such as `transcript`, `partial`, or `correction` while writing full NDJSON events to the `scratch/NNN-transcript.ndjson` file printed by `saving transcript to ...`.

JSON stream mode emits NDJSON. Every line is a JSON object.

Use `npm run --silent` for JSON/NDJSON examples so npm's script banner does not contaminate stdout.

Required fields:

| Field | Description |
|-------|-------------|
| `schemaVersion` | Output schema version. Starts at `1`. |
| `event` | `status`, `transcript`, `partial`, `correction`, `unavailable`, `error`, or `end`. |
| `sequence` | Monotonic sequence number per process. |
| `timestamp` | CLI observation timestamp. |
| `source` | `dom`, `network`, `websocket`, `teams-state`, or `unknown`. |

Text events include `text` and may include `speaker`. `unavailable` and `error` events include `reason`.

## Limitations

Teams live transcript/caption transport is not a stable public browser contract. v1 uses a DOM-first probe and reports `unavailable` when no supported source is detected.

The CLI does not persist transcript content by default.

## Debugging bad output

If output duplicates, loses speakers, or stops updating, first capture raw caption DOM samples:

```bash
just dump-raw-captions 30000
```

Then inspect `scratch/raw-captions.ndjson`. This file is intentionally under gitignored `scratch/`.

Use the dump to validate selector and formatting assumptions before changing code. Known useful checks:

- Prefer `span[data-tid="closed-caption-text"]` leaf nodes for caption text.
- Avoid broad caption wrapper nodes; they can include historical caption text.
- Speaker names may be sibling elements before the caption text, not attributes on the caption text node.
- Progressive captions may arrive as text rewrites, so output code should distinguish updates from new utterances.

For a fuller privacy-safe remote debugging workflow, see [Debug live caption capture](debug-live-captions.md).

## Stopping a stream

Press `Ctrl-C` to stop a running stream. The CLI forwards the interrupt to the active probe, closes browser/CDP resources, and emits an `end` event in JSON mode when possible.

`--idle-timeout-ms` controls how long the CLI waits for the first transcript event. After the first event, the stream stays alive until `Ctrl-C`, `--max-duration-ms`, or an adapter failure.
