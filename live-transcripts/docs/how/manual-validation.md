# Manual Validation Runbook

Use this runbook for live Teams validation. Record only redacted evidence.

## Preconditions

1. Edge or Chrome is running with CDP enabled. Safari is not supported.
2. The user is signed into Teams.
3. A Teams meeting is active.
4. Captions or transcription are enabled if the meeting permits them.

## Commands

```bash
just boot
just check
just interact
just observe
npm run --silent cli -- status
npm run --silent cli -- status --json
npm run --silent cli -- stream --idle-timeout-ms 5000
npm run --silent cli -- stream --json --idle-timeout-ms 5000
```

For interrupt validation, start a longer stream and press `Ctrl-C`:

```bash
npm run --silent cli -- stream --json --idle-timeout-ms 30000
```

## Evidence to record

| Check | Evidence |
|-------|----------|
| Boot/check/interact/observe | Command names and pass/fail status. |
| `status` | Whether CDP, Teams tab, and meeting controls were detected. |
| `status --json` | JSON parses and contains no human prose. |
| `stream` | Transcript text, `unavailable`, or `error` result category only; do not store raw transcript text. |
| `stream --json` | Each line parses as JSON and event names are as expected. |
| Interrupt handling | `Ctrl-C` exits the stream without leaving the process running. |
| Privacy | No cookies, authorization headers, tokens, raw frames, or raw transcript payloads appear in logs. |

## Redaction rule

Do not copy meeting content into validation notes. Summarize as `transcript event observed`, `unavailable`, or `error`.
