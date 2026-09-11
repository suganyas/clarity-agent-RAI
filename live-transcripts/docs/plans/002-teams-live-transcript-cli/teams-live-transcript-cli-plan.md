# Teams Live Transcript CLI Implementation Plan

**Mode**: Simple  
**Plan Version**: 1.0.0  
**Created**: 2026-05-29  
**Spec**: [teams-live-transcript-cli-spec.md](./teams-live-transcript-cli-spec.md)  
**Status**: READY

**Readiness Caveat**: READY means implementation-ready for the planned local CLI and adapter discovery path. It does **not** mean the live Teams transcript transport is already proven; v1 must treat transcript discovery failure as a supported `unavailable` outcome.

## Gate Matrix

| Gate | Check | Status | Notes |
|------|-------|--------|-------|
| G1 | Clarify | PASS | No `[NEEDS CLARIFICATION]` markers remain; plan resolves open command/output questions as v1 implementation decisions. |
| G2 | Constitution | N/A | No `docs/project-rules/constitution.md` exists. |
| G3 | Architecture | N/A | No `docs/project-rules/architecture.md` exists. |
| G4 | ADR Compliance | N/A | No accepted ADRs exist. |
| G5 | Structure | PASS | Required Simple Mode sections are present; task table has paths and done criteria. |
| G6 | Testing Alignment | PASS | Hybrid strategy reflected by test-first core/output tasks plus manual live Teams validation. |
| G7 | Domain Completeness | PASS | All five spec domains appear, each NEW domain has setup tasks, and all task paths are mapped in the Domain Manifest. |

## Summary

Build a local CLI that attaches to an already-running Edge CDP session, finds the active Teams meeting tab, and streams live transcript/caption events when a supported source is detected. The implementation starts with the agent harness, domain records, CLI/output contracts, and adapter seams so the unstable Teams transport remains isolated. v1 uses an explicit `status` command for diagnostics and an explicit `stream` command for transcript output; `--json` stream mode emits NDJSON events. If transcript/caption transport discovery fails, the CLI must report `unavailable` deterministically rather than claiming success.

## Target Domains

| Domain | Status | Relationship | Role |
|--------|--------|--------------|------|
| cli-shell | **NEW** | create | Own command surface, argument parsing, exit-code behavior, and stdout/stderr routing. |
| output-presentation | **NEW** | create | Own human rendering, JSON result envelopes, and NDJSON stream event rendering. |
| teams-session | **NEW** | create | Own active Teams tab discovery, meeting-state detection, and capability diagnostics. |
| transcript-stream | **NEW** | create | Own transcript/caption event model, normalization, stream lifecycle, and unavailable states. |
| external-adapters | **NEW** | create | Own concrete Edge CDP, Playwright, network, DOM, redaction, and manual-observation integration. |

## Domain Manifest

| File | Domain | Classification | Rationale |
|------|--------|----------------|-----------|
| `/Users/jak/temp/get-transciprt/docs/project-rules/engineering-harness.md` | cli-shell | cross-domain | Agent harness governs validation for all CLI work. |
| `/Users/jak/temp/get-transciprt/justfile` | cli-shell | contract | Engineering substrate entry points for boot/test/validate commands. |
| `/Users/jak/temp/get-transciprt/package.json` | cli-shell | contract | Defines executable, scripts, dependencies, and package metadata. |
| `/Users/jak/temp/get-transciprt/tsconfig.json` | cli-shell | internal | Compiler configuration for the CLI implementation. |
| `/Users/jak/temp/get-transciprt/src/cli/main.ts` | cli-shell | contract | CLI process entrypoint and exit-code boundary. |
| `/Users/jak/temp/get-transciprt/src/cli/args.ts` | cli-shell | internal | Parses commands and global `--json` option. |
| `/Users/jak/temp/get-transciprt/src/cli/help.ts` | cli-shell | internal | Human usage text. |
| `/Users/jak/temp/get-transciprt/src/bootstrap.ts` | cli-shell | cross-domain | Composition root wiring domains and adapters. |
| `/Users/jak/temp/get-transciprt/src/app/commands/status.ts` | teams-session | cross-domain | Status use case consumes teams-session and renders via output domain. |
| `/Users/jak/temp/get-transciprt/src/app/commands/stream.ts` | transcript-stream | cross-domain | Stream use case consumes transcript-stream and emits renderable events. |
| `/Users/jak/temp/get-transciprt/src/ports/teams-session.ts` | teams-session | contract | Port for Teams tab and meeting-state detection. |
| `/Users/jak/temp/get-transciprt/src/ports/transcript-source.ts` | transcript-stream | contract | Port for live transcript/caption event sources. |
| `/Users/jak/temp/get-transciprt/src/domain/teams-session/types.ts` | teams-session | contract | Stable status and capability DTOs. |
| `/Users/jak/temp/get-transciprt/src/domain/transcript-stream/events.ts` | transcript-stream | contract | Stable transcript and lifecycle event DTOs. |
| `/Users/jak/temp/get-transciprt/src/domain/transcript-stream/normalize.ts` | transcript-stream | internal | Converts raw source observations into stable events. |
| `/Users/jak/temp/get-transciprt/src/output/result.ts` | output-presentation | contract | JSON result envelope and error shape. |
| `/Users/jak/temp/get-transciprt/src/output/human.ts` | output-presentation | internal | Human renderers for status, errors, and transcript lines. |
| `/Users/jak/temp/get-transciprt/src/output/json.ts` | output-presentation | internal | JSON and NDJSON renderers. |
| `/Users/jak/temp/get-transciprt/src/adapters/edge-cdp/edgeCdpClient.ts` | external-adapters | internal | Connects to the pre-launched Edge CDP endpoint. |
| `/Users/jak/temp/get-transciprt/src/adapters/teams/teamsTabAdapter.ts` | external-adapters | internal | Finds Teams tab and detects meeting UI state. |
| `/Users/jak/temp/get-transciprt/src/adapters/teams/transcriptProbeAdapter.ts` | external-adapters | internal | Observes DOM/network/WebSocket candidates for transcript events. |
| `/Users/jak/temp/get-transciprt/src/adapters/security/redaction.ts` | external-adapters | contract | Redacts tokens, cookies, URLs, headers, and raw payloads before logs/errors. |
| `/Users/jak/temp/get-transciprt/src/adapters/security/diagnostics.ts` | external-adapters | contract | Defines the only adapter diagnostic/error shape, forcing redaction before data leaves adapters. |
| `/Users/jak/temp/get-transciprt/tests/cli/args.test.ts` | cli-shell | internal | Tests command parsing and output mode behavior. |
| `/Users/jak/temp/get-transciprt/tests/output/renderers.test.ts` | output-presentation | internal | Tests human, JSON, NDJSON, and error rendering. |
| `/Users/jak/temp/get-transciprt/tests/domain/transcript-events.test.ts` | transcript-stream | internal | Tests event DTOs and normalization from sanitized fixtures. |
| `/Users/jak/temp/get-transciprt/tests/app/status.test.ts` | teams-session | internal | Tests status command behavior with fake adapters. |
| `/Users/jak/temp/get-transciprt/tests/app/stream.test.ts` | transcript-stream | internal | Tests stream command behavior with fake transcript source. |
| `/Users/jak/temp/get-transciprt/tests/adapters/redaction.test.ts` | external-adapters | internal | Tests sensitive-value redaction. |
| `/Users/jak/temp/get-transciprt/tests/fixtures/transcript-observations/*.json` | transcript-stream | internal | Sanitized fixture inputs for normalization tests. |
| `/Users/jak/temp/get-transciprt/docs/domains/registry.md` | cli-shell | contract | Domain registry for the new system. |
| `/Users/jak/temp/get-transciprt/docs/domains/domain-map.md` | cli-shell | contract | Domain topology and dependency edges. |
| `/Users/jak/temp/get-transciprt/docs/domains/cli-shell/domain.md` | cli-shell | contract | Domain doc, concepts, contracts, and composition. |
| `/Users/jak/temp/get-transciprt/docs/domains/output-presentation/domain.md` | output-presentation | contract | Domain doc, concepts, contracts, and composition. |
| `/Users/jak/temp/get-transciprt/docs/domains/teams-session/domain.md` | teams-session | contract | Domain doc, concepts, contracts, and composition. |
| `/Users/jak/temp/get-transciprt/docs/domains/transcript-stream/domain.md` | transcript-stream | contract | Domain doc, concepts, contracts, and composition. |
| `/Users/jak/temp/get-transciprt/docs/domains/external-adapters/domain.md` | external-adapters | contract | Domain doc, concepts, contracts, and composition. |
| `/Users/jak/temp/get-transciprt/README.md` | cli-shell | contract | Quick start and usage examples. |
| `/Users/jak/temp/get-transciprt/docs/how/edge-cdp.md` | external-adapters | contract | How to launch Edge with CDP and troubleshoot attachment. |
| `/Users/jak/temp/get-transciprt/docs/how/live-transcript.md` | transcript-stream | contract | Stream usage, NDJSON schema, limitations, and privacy guidance. |
| `/Users/jak/temp/get-transciprt/docs/how/manual-validation.md` | transcript-stream | contract | Repeatable live Teams validation runbook and redacted evidence capture requirements. |

## Key Findings

| # | Impact | Finding | Action |
|---|--------|---------|--------|
| 01 | Critical | The repository is greenfield: no CLI, source, tests, domains, or harness exist. | Start with harness, package metadata, domain records, and narrow contracts before integration logic. |
| 02 | High | Output rendering must be centralized so `--json` remains a presentation mode. | Build result/NDJSON renderers before commands print anything; forbid direct output in core use cases. |
| 03 | High | Ports/adapters are the primary architecture boundary. | Keep CDP, Playwright, DOM, network, and redaction logic in external adapters wired through ports. |
| 04 | Critical | The exact Teams transcript/caption source is unconfirmed. | Add an isolated transcript probe adapter and make `unavailable` a first-class stream state until discovery succeeds. |
| 05 | High | NDJSON stream semantics need stable event records. | Define explicit event types for status, transcript, partial/correction if observed, unavailable, error, and end. |
| 06 | High | Human mode behavior affects stdout semantics. | Use explicit `status` and `stream` commands; stream content goes to stdout, diagnostics/errors go to stderr. |
| 07 | High | Edge/CDP attachment can connect to the wrong or stale browser/tab. | Add endpoint, tab-selection, signed-in Teams, and active-meeting diagnostics before stream startup. |
| 08 | High | Session and transcript content can leak through debug logs/errors. | Centralize redaction and prohibit raw request, cookie, authorization, token, and transcript payload logging by default. |

## Implementation

**Objective**: Establish a validated local CLI that can diagnose a pre-launched Edge/Teams session and stream live transcript/caption events through stable human and NDJSON output contracts.

**Testing Approach**: Hybrid — TDD for CLI parsing, output wrappers, DTOs, normalization, and command orchestration; targeted fakes for external systems; manual validation for live Teams/CDP behavior.

### Public CLI and Output Contract

#### Commands and Configuration

| Contract | Requirement |
|----------|-------------|
| CDP endpoint default | `http://127.0.0.1:9222` |
| CDP endpoint override | `--cdp-endpoint <url>` takes precedence over `TEAMS_CDP_ENDPOINT`; `TEAMS_CDP_ENDPOINT` takes precedence over the default. |
| Commands | `help`, `status`, `stream` |
| Global output flag | `--json` changes rendering only; command behavior and exit codes stay consistent. |
| Stream lifecycle flags | `--idle-timeout-ms <number>` defaults to `30000`; `--max-duration-ms <number>` is optional and unset by default. |
| Interrupt behavior | `Ctrl-C` stops observation, emits an `end` event in JSON mode when possible, closes adapter resources, and exits non-zero only if shutdown fails. |

#### JSON Result Envelope

Non-streaming JSON commands emit one object to stdout:

```json
{
  "schemaVersion": 1,
  "ok": true,
  "command": "status",
  "data": {},
  "meta": {
    "timestamp": "2026-05-29T00:00:00.000Z",
    "cdpEndpoint": "http://127.0.0.1:9222"
  }
}
```

Errors emit one object to stdout in JSON mode and human diagnostics to stderr in human mode:

```json
{
  "schemaVersion": 1,
  "ok": false,
  "command": "status",
  "error": {
    "code": "CDP_UNREACHABLE",
    "message": "Edge CDP endpoint is not reachable",
    "details": {
      "cdpEndpoint": "http://127.0.0.1:9222"
    }
  },
  "meta": {
    "timestamp": "2026-05-29T00:00:00.000Z"
  }
}
```

#### NDJSON Stream Events

`stream --json` emits one JSON object per line to stdout. Required fields for every event:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `schemaVersion` | number | yes | Starts at `1`. |
| `event` | string | yes | One of `status`, `transcript`, `partial`, `correction`, `unavailable`, `error`, `end`. |
| `sequence` | number | yes | Monotonic per process. |
| `timestamp` | string | yes | ISO-8601 timestamp generated by the CLI. |
| `source` | string | yes | `dom`, `network`, `websocket`, `teams-state`, or `unknown`. |
| `text` | string | event-dependent | Required for `transcript`, `partial`, and `correction` when source provides text. |
| `speaker` | string | no | Omitted when unavailable. |
| `reason` | string | event-dependent | Required for `unavailable` and `error`. |
| `diagnostics` | object | no | Redacted-only adapter metadata. |

If no transcript/caption source is detected, `stream` has one canonical outcome: human mode writes an actionable unavailable message to stderr and exits with code `20`; JSON mode emits one `unavailable` NDJSON event to stdout, writes diagnostics to stderr only if useful, and exits with code `20`.

### Tasks

| Status | ID | Task | Domain | Path(s) | Done When | Notes |
|--------|----|------|--------|---------|-----------|-------|
| [x] | T001 | Create agent harness doc and minimal engineering substrate commands. | cli-shell | `/Users/jak/temp/get-transciprt/docs/project-rules/engineering-harness.md`, `/Users/jak/temp/get-transciprt/justfile` | Harness documents boot, interact, observe, validation commands, and reaches at least L2 target maturity for CLI work. | Phase 0 from spec clarification. |
| [x] | T002 | Create package and compiler scaffold. | cli-shell | `/Users/jak/temp/get-transciprt/package.json`, `/Users/jak/temp/get-transciprt/tsconfig.json` | CLI can be installed/run locally; scripts exist for test, build/typecheck, and basic validation. | Keep startup light; defer Playwright-heavy imports to adapters. |
| [x] | T003 | Create domain registry, domain map, and five domain docs with Concepts sections. | cli-shell, output-presentation, teams-session, transcript-stream, external-adapters | `/Users/jak/temp/get-transciprt/docs/domains/registry.md`, `/Users/jak/temp/get-transciprt/docs/domains/domain-map.md`, `/Users/jak/temp/get-transciprt/docs/domains/cli-shell/domain.md`, `/Users/jak/temp/get-transciprt/docs/domains/output-presentation/domain.md`, `/Users/jak/temp/get-transciprt/docs/domains/teams-session/domain.md`, `/Users/jak/temp/get-transciprt/docs/domains/transcript-stream/domain.md`, `/Users/jak/temp/get-transciprt/docs/domains/external-adapters/domain.md` | All spec domains are registered with purpose, boundary, contracts, concepts, and dependency edges. | Required by G7 for NEW domains. |
| [x] | T004 | Write CLI parser tests for commands, CDP endpoint configuration, stream lifecycle flags, and global output mode. | cli-shell | `/Users/jak/temp/get-transciprt/tests/cli/args.test.ts` | Tests cover help/default behavior, `status`, `stream`, `--json`, invalid command, `--cdp-endpoint`, `TEAMS_CDP_ENDPOINT`, `--idle-timeout-ms`, `--max-duration-ms`, and exit intent. | Test before parser implementation. |
| [x] | T005 | Implement CLI parser, help text, main entrypoint, CDP config resolution, stream lifecycle options, and composition root. | cli-shell | `/Users/jak/temp/get-transciprt/src/cli/args.ts`, `/Users/jak/temp/get-transciprt/src/cli/help.ts`, `/Users/jak/temp/get-transciprt/src/cli/main.ts`, `/Users/jak/temp/get-transciprt/src/bootstrap.ts` | CLI shows help, routes `status` and `stream`, preserves `--json`, resolves CDP endpoint precedence, handles lifecycle flags, and maps command outcomes to stdout/stderr/exit code. | Per findings 02 and 06. |
| [x] | T006 | Write output renderer tests for result envelopes, human output, NDJSON events, and structured errors. | output-presentation | `/Users/jak/temp/get-transciprt/tests/output/renderers.test.ts` | Tests prove human and JSON renderers consume the same DTOs and `--json` stdout has no human prose. | Test before renderers. |
| [x] | T007 | Implement output result envelope, human renderer, JSON renderer, and NDJSON renderer. | output-presentation | `/Users/jak/temp/get-transciprt/src/output/result.ts`, `/Users/jak/temp/get-transciprt/src/output/human.ts`, `/Users/jak/temp/get-transciprt/src/output/json.ts` | Renderers support status results, transcript events, unavailable/error/end events, schema versioning, and stdout/stderr separation. | Per findings 02 and 05. |
| [x] | T008 | Write status command tests with fake Teams session adapter. | teams-session | `/Users/jak/temp/get-transciprt/tests/app/status.test.ts` | Tests cover CDP unavailable, Teams tab missing, meeting inactive, meeting active, and JSON/human result mapping. | Test external behavior through port. |
| [x] | T009 | Define Teams session port/types and implement status command use case. | teams-session | `/Users/jak/temp/get-transciprt/src/ports/teams-session.ts`, `/Users/jak/temp/get-transciprt/src/domain/teams-session/types.ts`, `/Users/jak/temp/get-transciprt/src/app/commands/status.ts` | Status command returns structured diagnostics without directly touching Playwright/CDP or printing. | Per findings 03 and 07. |
| [x] | T010 | Write transcript event and stream command tests with sanitized fixtures/fakes. | transcript-stream | `/Users/jak/temp/get-transciprt/tests/domain/transcript-events.test.ts`, `/Users/jak/temp/get-transciprt/tests/app/stream.test.ts`, `/Users/jak/temp/get-transciprt/tests/fixtures/transcript-observations/*.json` | Tests cover transcript, partial/correction if fixture shows it, unavailable, error, end, sequence ordering, idle timeout, max duration, interrupt handling, and NDJSON rendering. | Add empty fixture placeholder only until safe sanitized observations exist. |
| [x] | T011 | Define transcript event DTOs, transcript source port, normalizer, lifecycle handling, and stream command use case. | transcript-stream | `/Users/jak/temp/get-transciprt/src/domain/transcript-stream/events.ts`, `/Users/jak/temp/get-transciprt/src/domain/transcript-stream/normalize.ts`, `/Users/jak/temp/get-transciprt/src/ports/transcript-source.ts`, `/Users/jak/temp/get-transciprt/src/app/commands/stream.ts` | Stream command consumes a transcript source port and emits stable renderable events; no-source detection emits canonical `unavailable` and exit code `20`; idle timeout, max duration, and interrupt handling close resources deterministically. | Per findings 04 and 05. |
| [x] | T012 | Write redaction and diagnostics tests for sensitive headers, cookies, tokens, URLs, raw payload snippets, and adapter error shapes. | external-adapters | `/Users/jak/temp/get-transciprt/tests/adapters/redaction.test.ts` | Tests prove adapter errors/log metadata can only be created through redacted diagnostics and redact authorization, cookies, token-like values, query secrets, and transcript payload snippets. | Test before adapter logging/errors. |
| [x] | T013 | Implement redaction utility and typed redacted diagnostics wrapper for all external adapter diagnostics. | external-adapters | `/Users/jak/temp/get-transciprt/src/adapters/security/redaction.ts`, `/Users/jak/temp/get-transciprt/src/adapters/security/diagnostics.ts` | External adapters expose only typed redacted diagnostics; raw payload/log emission is not part of adapter contracts. | Per finding 08. |
| [x] | T014 | Implement Edge CDP client and Teams tab adapter. | external-adapters | `/Users/jak/temp/get-transciprt/src/adapters/edge-cdp/edgeCdpClient.ts`, `/Users/jak/temp/get-transciprt/src/adapters/teams/teamsTabAdapter.ts` | Status command can connect to the resolved local CDP endpoint, report endpoint source/default/override, select a Teams tab, detect active meeting controls, and return redacted diagnostics for unreachable or mismatched endpoints. | v1 requires pre-launched Edge/CDP. |
| [x] | T015 | Implement transcript probe adapter behind the transcript source port. | external-adapters | `/Users/jak/temp/get-transciprt/src/adapters/teams/transcriptProbeAdapter.ts` | Stream command can observe the selected Teams tab for candidate DOM/network/WebSocket transcript/caption events, emits normalized events or canonical `unavailable`, honors idle timeout/max duration/interrupt cancellation, and never logs raw frames. | Treat transport as unstable; no raw frame logging. |
| [x] | T016 | Wire real adapters into the composition root while keeping tests on fakes. | cli-shell, external-adapters | `/Users/jak/temp/get-transciprt/src/bootstrap.ts` | Default CLI uses real Edge/Teams adapters; tests can inject fakes without importing Playwright/CDP into core modules. | Composition comes after contracts/adapters. |
| [x] | T017 | Add README and how-to documentation. | cli-shell, external-adapters, transcript-stream | `/Users/jak/temp/get-transciprt/README.md`, `/Users/jak/temp/get-transciprt/docs/how/edge-cdp.md`, `/Users/jak/temp/get-transciprt/docs/how/live-transcript.md`, `/Users/jak/temp/get-transciprt/docs/how/manual-validation.md` | Docs cover install/run, pre-launching Edge with CDP, `status`, `stream`, `--json` NDJSON schema, privacy limits, known Teams limitations, and repeatable manual validation. | Hybrid docs strategy. |
| [x] | T018 | Run automated validation and manual live Teams validation. | cli-shell, teams-session, transcript-stream, external-adapters | `/Users/jak/temp/get-transciprt/justfile`, `/Users/jak/temp/get-transciprt/docs/project-rules/engineering-harness.md`, `/Users/jak/temp/get-transciprt/docs/how/manual-validation.md` | Test/build/validation commands pass; manual validation follows the runbook, verifies `status`, `status --json`, `stream`, `stream --json` NDJSON shape, stdout/stderr separation, no-source behavior, interrupt behavior, and records only redacted evidence. | Manual result did not persist transcript content after validation rerun; only event categories were printed. |

### Acceptance Criteria

- [ ] Running the CLI with no command or `--help` displays human-readable usage.
- [ ] Running `status` in human mode reports Edge CDP reachability, Teams tab attachment, and active meeting detection.
- [ ] Running `status --json` emits a valid JSON result envelope and no human prose on stdout.
- [ ] Running `stream` in a supported active meeting emits transcript/caption events as they arrive.
- [ ] Running `stream --json` emits NDJSON events with stable event type, text when available, speaker when available, timestamp/sequence metadata, and source status.
- [ ] If Edge CDP is unavailable, the CLI exits non-zero with an actionable human message or structured JSON error.
- [ ] If Teams is reachable but no transcript/caption source is detected, `stream` reports canonical `unavailable` and exits with code `20` without claiming transcript success.
- [ ] The implementation does not persist browser tokens, cookies, or transcript content by default.
- [ ] Core command logic does not print directly; all output flows through output-presentation renderers.
- [ ] Teams/browser/CDP access is isolated behind adapters that can be replaced by test fakes.
- [ ] v1 requires an already-running local Edge CDP endpoint and does not relaunch Edge automatically.

### Validation Matrix

| Scenario | Command | Expected Evidence |
|----------|---------|-------------------|
| Help output | `npm run --silent cli -- --help` or built `teams-transcript --help` | Human usage on stdout; exit `0`. |
| Status human | `npm run --silent cli -- status` or built `teams-transcript status` | Edge CDP endpoint, Teams tab state, meeting state; diagnostics on stderr only when needed. |
| Status JSON | `npm run --silent cli -- status --json` or built `teams-transcript status --json` | One JSON result envelope on stdout; parseable with `JSON.parse`; no human prose on stdout. |
| CDP unavailable | `TEAMS_CDP_ENDPOINT=http://127.0.0.1:1 npm run --silent cli -- status` | Non-zero exit; actionable human error or JSON error envelope. |
| Stream unavailable | `npm run --silent cli -- stream --idle-timeout-ms 1000` in a meeting with no detected source | Human unavailable message to stderr and exit `20`; no success claim. |
| Stream JSON unavailable | `npm run --silent cli -- stream --json --idle-timeout-ms 1000` in a meeting with no detected source | One NDJSON `unavailable` event on stdout and exit `20`. |
| Stream JSON shape | `npm run --silent cli -- stream --json` during a supported live source | Each stdout line parses as JSON and contains required NDJSON fields. |
| Interrupt handling | Start `npm run --silent cli -- stream --json`, then send interrupt | Adapter resources close; `end` event emitted when possible; no unhandled rejection. |
| Privacy | Any command with adapter diagnostics | No authorization, cookie, token-like value, raw frame, or raw transcript payload appears in logs/errors. |
| Manual live Teams validation | Follow `docs/how/manual-validation.md` | Redacted evidence records commands, exit codes, stdout/stderr classification, and whether transcript source was `transcript`, `unavailable`, or `error`. |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Teams transcript/caption source is not discoverable through CDP-accessible DOM/network events. | Medium | Critical | Keep `unavailable` as a valid outcome; isolate probe adapter; document limitation; prefer official APIs in future browserless mode. |
| Teams transport or payload shape changes. | High | High | Fixture-backed normalizer tests, feature detection, no hard-coded success assumptions, clear diagnostics. |
| CDP connects to the wrong browser profile or stale Teams tab. | Medium | High | Status command reports endpoint, tab selection, URL/title class, and meeting UI indicators before streaming. |
| Sensitive browser/session/transcript data leaks through logs. | Medium | High | Central redaction utility, no raw request/frame logging, no persistence by default. |
| Live validation is hard to reproduce in CI. | High | Medium | Separate deterministic core tests from manual live validation; document manual evidence expectations in harness. |
| Human transcript output ambiguity causes automation breakage. | Low | Medium | Use explicit `status` and `stream` commands; reserve stdout for content/results and stderr for diagnostics. |
| Stream command hangs indefinitely. | Medium | High | Require idle timeout, optional max duration, interrupt handling, and deterministic resource cleanup. |

## Agent Harness Strategy

- **Current Maturity**: L0 (no harness document or boot/interact/observe loop exists)
- **Target Maturity**: L2 by completion of T001
- **Boot Command**: `just boot`
- **Health Check**: `just check`
- **Interaction Model**: Terminal CLI commands, with browser/CDP manual validation for live Teams checks
- **Evidence Capture**: terminal output, JSON result envelopes, redacted manual validation notes
- **Pre-Phase Validation**: Required before implementation work and before live Teams validation: Boot -> Interact -> Observe

---

## Validation Record 2026-05-29T11:32:34+10:00

### Validation Thesis

**Raison d'être**: The plan exists to convert the Teams live transcript CLI spec into an implementation-ready sequence that reduces ambiguity around CLI boundaries, adapter seams, transcript-stream uncertainty, output contracts, and browser/session safety.

**Value claim**: Implementation should become safer and more repeatable because future implementation agents can follow concrete tasks, file paths, domain ownership, tests, and validation expectations without re-deciding architecture or leaking sensitive Teams/browser material.

**Artifact promise**: Downstream task-dossier and implementation phases can consume a READY task sequence with all spec domains represented, tests aligned to Hybrid strategy, and explicit mitigations for Edge/CDP, transcript discovery, NDJSON, and privacy risks.

**Intended beneficiaries**: Implementation agents, reviewers, future maintainers, and the user who needs a local Teams transcript CLI.

**Proof target**: Implementation.

**Evidence standard**: Direct match to spec acceptance criteria, concrete file paths, task ordering, test-before-implementation coverage for deterministic logic, adapter boundaries, domain manifest completeness, and risk mitigations traceable to spec/research.

**Thesis source**: User request, `teams-live-transcript-cli-spec.md`, `teams-live-transcript-cli-plan.md`, and `research-dossier.md`.

**Thesis verdict**: Partially advanced before fixes; advanced enough for implementation planning after fixes.

**Main thesis risk**: “READY” overstates proof when the live transcript source remains undiscovered.

---

| Agent | Lenses Covered | Thesis Axes Covered | Issues | Verdict |
|-------|----------------|---------------------|--------|---------|
| plan-coherence | System Behavior, Integration & Ripple, Domain Boundaries, Concept Documentation, Technical Constraints, Edge Cases & Failures | Implementation Readiness, Cross-Domain Coordination, Safety to Change | 1 MEDIUM fixed, 1 LOW fixed | VALIDATED WITH FIXES |
| plan-risk | Technical Constraints, Hidden Assumptions, Edge Cases & Failures, Performance & Scale, Security & Privacy, Deployment & Ops, Evidence Sufficiency | Operational Reliability, Safety to Change, Evidence Sufficiency | 4 HIGH fixed, 1 MEDIUM fixed | VALIDATED WITH FIXES |
| plan-completeness-thesis | Thesis Alignment, Evidence Sufficiency, Proof-Level Fit, User Experience, Domain Boundaries, Concept Documentation, Hidden Assumptions | Thesis Alignment, Implementation Readiness, Review Compression, Agent Readiness | 1 HIGH fixed, 1 MEDIUM fixed | VALIDATED WITH FIXES |
| forward-compatibility | Forward-Compatibility, Integration & Ripple, Contract Integrity, Test Boundary, Deployment & Ops, User Experience | Downstream Usefulness, Contract Integrity, Implementation Readiness | 1 HIGH fixed, 1 MEDIUM fixed | VALIDATED WITH FIXES |

### Forward-Compatibility Matrix

| Consumer | Requirement | Failure Mode | Verdict | Evidence |
|----------|-------------|--------------|---------|----------|
| `/plan-5-v2-phase-tasks-and-brief` | Concrete tasks with paths, domains, dependencies, and done criteria | lifecycle ownership | ✅ | Task table T001-T018 includes domains, paths, done criteria, validation matrix, and updated output/config contracts. |
| `/plan-6-v2-implement-phase` | Sequenced, test-aligned, domain-complete execution plan | test boundary | ✅ | Test-first parser/output/status/stream/redaction tasks precede implementation tasks; manual validation runbook is planned. |
| Future CLI users/scripts | Stable human mode, JSON result envelopes, NDJSON events, non-zero errors, and no secret/content persistence by default | shape mismatch | ✅ | Public CLI and Output Contract now defines JSON envelope, NDJSON fields, CDP config, lifecycle flags, canonical unavailable exit code, and redacted diagnostics. |

**Thesis alignment**: Value claim advanced? Partially; Proof level: Target = implementation; Actual = implementation-ready with one unresolved transport assumption; Main thesis risk: “READY” overstates proof when the live transcript source remains undiscovered.

**Outcome alignment**: The artifact mostly advances “Provide a CLI command that streams live transcript/caption events from the active Teams meeting when available,” but the missing explicit JSON/NDJSON schema leaves a downstream contract gap.

**Standalone?**: No — downstream consumers are `/plan-5-v2-phase-tasks-and-brief`, `/plan-6-v2-implement-phase`, and future CLI users/scripts.

Overall: VALIDATED WITH FIXES
