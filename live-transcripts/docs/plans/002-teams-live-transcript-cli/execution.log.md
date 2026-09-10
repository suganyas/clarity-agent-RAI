# Execution Log: Teams Live Transcript CLI

## 2026-05-29

### T001 — Create agent harness doc and minimal engineering substrate commands

**What changed**:
- Created `docs/project-rules/engineering-harness.md` with L2 boot, interact, observe, validation, safety, and history sections.
- Created `justfile` with `boot`, `check`, `interact`, `observe`, `test`, and `build` commands.

**Evidence**:
- `just boot`, `just check`, `just interact`, and `just observe` completed successfully.

## Discoveries & Learnings

| ID | Type | Discovery | Resolution |
|----|------|-----------|------------|
| DL-001 | decision | The harness must be useful before the package scaffold exists and after package scripts are added. | `justfile` commands use scaffold-safe fallbacks when `package.json` is absent and delegate to npm scripts once present. |
| DL-002 | insight | Installing the TypeScript/Vitest scaffold reported 4 moderate npm audit findings in dev dependencies. | Left unfixed because `npm audit fix --force` would apply breaking upgrades; track when dependency policy is defined. |
| DL-003 | gotcha | Tests can pass through Vitest while `tsc` still fails on union helper return types. | Keep `just check` as the task completion gate because it runs both build and tests. |
| DL-004 | gotcha | `npm run cli -- --json` contaminates stdout with npm's script banner, so JSON parsing fails even when the CLI output itself is valid. | Updated docs and validation commands to use `npm run --silent cli -- ...` or the built binary for machine-readable modes. |
| DL-005 | gotcha | A first validation attempt redirected live stream NDJSON to `/tmp`, which can temporarily persist transcript content. | Removed temp files immediately and reran validation through memory-only parsing that prints only event categories. |
| DL-006 | gotcha | The initial stream implementation accepted an AbortSignal type but the CLI entrypoint never wired SIGINT/SIGTERM into it. | Added an AbortController in `src/cli/main.ts`, passed it through bootstrap, and made the transcript probe emit `end` on interruption. |
| DL-007 | gotcha | Human transcript output was hard to read because speaker names and message text could run together visually in live output. | Changed human rendering to print speaker names on their own line and add a blank line between transcript messages. |
| DL-008 | gotcha | Teams DOM captions can expose progressive full-sentence expansions, which made the CLI print the same sentence repeatedly as it grew. | Added caption stabilization in the Teams probe so DOM text is emitted only after it stops changing or disappears, with prefix-expansion re-emission suppressed. |
| DL-009 | gotcha | `--idle-timeout-ms` was interpreted as an always-on inactivity timeout, so long meetings could exit after a quiet stretch even after transcript capture had started. | Changed idle timeout to apply only before the first transcript event; after capture starts the stream runs until Ctrl-C, max duration, or adapter failure. |
| DL-010 | gotcha | Selecting the longest caption DOM candidate can lock onto stale historical text, causing the live stream to stay running but stop showing newer shorter captions. | Changed caption selection to prefer the latest matching DOM candidate and changed human rendering to append partial deltas inline. |
| DL-011 | improvement-suggestion | Human terminal output for progressive captions is clearer if the current caption line updates in place instead of appending deltas as separate visible text. | Added TTY-aware rendering: interactive terminals use carriage-return line rewrites, while redirected output remains plain text. |
| DL-012 | gotcha | Speaker metadata can vary between progressive DOM caption updates, so using speaker equality as part of prefix-delta detection caused growing captions to be re-emitted as new transcript lines. | Made prefix-delta detection independent of speaker changes while preserving the most recent known speaker. |
| DL-013 | gotcha | Under `npm run --silent`, `process.stdout.isTTY` was not reliable enough for deciding whether to use in-place caption updates, so human stream mode still printed growing captions as new paragraphs. | Enabled TUI rewriting for human `stream` by default and added `TEAMS_TRANSCRIPT_PLAIN=1` as the opt-out for plain output. |
| DL-014 | gotcha | Some Teams DOM updates arrive as fresh `transcript` observations rather than `partial` deltas, so adapter-only dedupe was insufficient. | Added renderer-side rewrite detection for overlapping transcript text so growing captions update the open line in place even if classified as `transcript`. |
| DL-015 | improvement-suggestion | The working stream command was too long to type repeatedly during a live meeting. | Added `just stream-transcript [idle_timeout=10000]` as the default human live transcript shortcut. |
| DL-016 | gotcha | Teams stores the caption speaker label as a sibling before `span[data-tid=\"closed-caption-text\"]`, not as an attribute on the caption leaf. | Added row-sibling speaker extraction by climbing caption ancestors and reading the preceding speaker label child. |
| DL-017 | decision | Repeating the same speaker label on every caption line adds noise in live transcript mode. | Human rendering now prints a speaker name only when it changes from the previous known speaker. |
| INS-001 | insight | Raw caption DOM dumps are the fastest way to validate transcript selector, speaker, and formatting assumptions against real Teams output. | Keep `just dump-raw-captions` as the first debugging step for duplicate output, missing speakers, or stalled streams; inspect gitignored `scratch/raw-captions.ndjson` before changing probe logic. |
| DL-018 | improvement-suggestion | Recording NDJSON required a long shell pipeline and a manually chosen filename during meetings. | Added `just record-transcript [out] [idle_timeout]` and `just record-transcript-watch [out] [idle_timeout]`; without `out`, they choose the next `scratch/NNN-transcript.ndjson`. |

### T002 — Create package and compiler scaffold

**What changed**:
- Created `package.json` with CLI metadata, npm scripts, and TypeScript/Vitest dev dependencies.
- Created `tsconfig.json` with strict NodeNext TypeScript settings.
- Added a minimal `src/cli/main.ts` help entrypoint so `just interact` has a CLI path to exercise.
- Installed dependencies and generated `package-lock.json`.

**Evidence**:
- `npm install` completed.
- `just boot`, `just check`, `just interact`, and `just observe` completed successfully.

### T003 — Create domain registry, domain map, and five domain docs

**What changed**:
- Created `docs/domains/registry.md` and `docs/domains/domain-map.md`.
- Created domain docs for `cli-shell`, `output-presentation`, `teams-session`, `transcript-stream`, and `external-adapters`.
- Created planned source/test directory structure for the five domains.

**Evidence**:
- `just check` completed successfully.

### T004 — Write CLI parser tests

**What changed**:
- Added `tests/cli/args.test.ts` covering default help, `status`, `stream`, `--json`, CDP endpoint precedence, lifecycle flags, invalid commands, missing values, and invalid numeric flags.

**Evidence**:
- `npm test -- --run tests/cli/args.test.ts` failed because `src/cli/args.ts` did not exist yet, confirming the expected red state before T005.

### T005 — Implement CLI parser, help, entrypoint, and bootstrap

**What changed**:
- Added `src/cli/args.ts` for command parsing, output mode, CDP endpoint precedence, and stream lifecycle flags.
- Added `src/cli/help.ts` and updated `src/cli/main.ts` to use parser/help/bootstrap.
- Added `src/bootstrap.ts` scaffold command dispatcher.

**Evidence**:
- `just check`, `just interact`, and `just observe` completed successfully.

### T006 — Write output renderer tests

**What changed**:
- Added `tests/output/renderers.test.ts` covering JSON result envelopes, structured JSON errors, NDJSON one-line events, human status output, and human errors.

**Evidence**:
- `npm test -- --run tests/output/renderers.test.ts` failed because output renderer modules did not exist yet, confirming expected red state before T007.

### T007 — Implement output result envelope and renderers

**What changed**:
- Added `src/output/result.ts`, `src/output/human.ts`, and `src/output/json.ts`.
- Implemented schema versioned result envelopes, structured errors, human status/error rendering, and NDJSON event rendering.

**Evidence**:
- `just check` completed successfully.

### T008 — Write status command tests

**What changed**:
- Added `tests/app/status.test.ts` covering active meeting JSON success, inactive meeting human success, CDP unavailable JSON error, and missing Teams tab human error.

**Evidence**:
- `npm test -- --run tests/app/status.test.ts` failed because `src/app/commands/status.ts` did not exist yet, confirming expected red state before T009.

### T009 — Implement Teams session port, types, and status use case

**What changed**:
- Added `TeamsSessionStatus` DTO and `TeamsSessionPort`.
- Added `runStatus` use case with JSON/human success and structured error mapping.

**Evidence**:
- `just check` completed successfully.

### T010 — Write transcript event and stream command tests

**What changed**:
- Added `tests/domain/transcript-events.test.ts`.
- Added `tests/app/stream.test.ts`.
- Added an empty sanitized fixture directory placeholder.

**Evidence**:
- `npm test -- --run tests/domain/transcript-events.test.ts tests/app/stream.test.ts` failed because stream modules did not exist yet, confirming expected red state before T011.

### T011 — Implement transcript event DTOs, source port, normalizer, and stream use case

**What changed**:
- Added transcript event and observation DTOs.
- Added transcript source port.
- Added normalizer and stream command use case with NDJSON/human rendering and canonical unavailable exit code `20`.

**Evidence**:
- `just check` completed successfully.

### T012 — Write redaction and diagnostics tests

**What changed**:
- Added `tests/adapters/redaction.test.ts` covering sensitive header/cookie/token/query redaction, raw transcript-like string redaction, and typed adapter diagnostics.

**Evidence**:
- `npm test -- --run tests/adapters/redaction.test.ts` failed because redaction/diagnostics modules did not exist yet, confirming expected red state before T013.

### T013 — Implement redaction utility and diagnostics wrapper

**What changed**:
- Added `src/adapters/security/redaction.ts`.
- Added `src/adapters/security/diagnostics.ts`.
- Preserved URL formatting while redacting sensitive query values.

**Evidence**:
- `just check` completed successfully.

### T014 — Implement Edge CDP client and Teams tab adapter

**What changed**:
- Added `src/adapters/edge-cdp/edgeCdpClient.ts`.
- Added `src/adapters/teams/teamsTabAdapter.ts`.
- Added `playwright-core` runtime dependency.

**Evidence**:
- `just check` completed successfully.

### T015 — Implement transcript probe adapter

**What changed**:
- Added `src/adapters/teams/transcriptProbeAdapter.ts`.
- Implemented DOM-first caption probing with idle timeout and canonical unavailable fallback.

**Evidence**:
- `just check` completed successfully.

### T016 — Wire real adapters into composition root

**What changed**:
- Updated `src/bootstrap.ts` so `status` uses `TeamsTabAdapter` and `stream` uses `TranscriptProbeAdapter`.

**Evidence**:
- `just check` completed successfully.
- `npm run cli -- status --json --cdp-endpoint http://127.0.0.1:1` returned structured `CDP_UNREACHABLE` JSON and non-zero command behavior.

### T017 — Add README and how-to documentation

**What changed**:
- Added `README.md`.
- Added `docs/how/edge-cdp.md`, `docs/how/live-transcript.md`, and `docs/how/manual-validation.md`.
- Updated examples to use `npm run --silent` for machine-readable output.

**Evidence**:
- `just check` completed successfully.

### T018 — Run automated validation and manual live Teams validation

**What changed**:
- Ran final automated harness and test validation.
- Ran live-safe Teams status and stream checks against the active Edge CDP session.
- Removed temporary validation files and reran stream parsing without persisting stream content.

**Evidence**:
- `just boot`, `just check`, `just interact`, and `just observe` completed successfully.
- `just check`: 6 test files passed, 23 tests passed.
- `status --json`: parsed successfully; reported CDP reachable, Teams tab found, meeting active.
- `stream --json --idle-timeout-ms 1000`: parsed successfully; printed only event categories (`transcript`, `transcript`, `end`) and exit code `0`.
