# Teams Live Transcript CLI

**Mode**: Simple

## Research Context

📚 Specification incorporates findings from `docs/plans/001-start-little-cli/research-dossier.md`.

The repository is a greenfield folder with no existing CLI, package metadata, source tree, tests, domains, or harness. Prior research recommends a small CLI foundation with clean boundaries: a thin CLI shell, pure application/use-case logic, ports for external systems, adapters for browser/CDP/network access, a composition root, and centralized output wrappers where `--json` changes only rendering.

Live Teams investigation already established that Edge can be relaunched with remote debugging, Playwright can attach to the active Teams tab over CDP, and the meeting UI is observable. Initial network observation suggests live meeting updates are not SSE; traffic includes broker subscription fetches and WebSocket/live-channel frames. The exact transcript/caption payload path still needs targeted observation while captions or transcription are visibly active.

## Summary

Build a small local CLI that can connect to a logged-in Teams browser session and extract live meeting transcript/caption events as they arrive. The CLI should default to human-readable output, support `--json` for automation, and isolate Teams/browser/network access behind adapters so the command surface remains clean and composable.

## Goals

- Provide a CLI command that reports whether it can connect to the active Teams session.
- Provide a CLI command that streams live transcript/caption events from the active Teams meeting when available.
- Support human output by default and structured JSON output with `--json`.
- Keep external Teams, browser, CDP, network, and session concerns behind adapters.
- Avoid persisting browser-derived tokens or sensitive meeting content unless explicitly requested by a future feature.
- Produce clear failure messages when Edge, CDP, Teams, or transcript data is unavailable.

## Non-Goals

- Building a Teams bot, Graph app registration, or cloud service.
- Joining meetings automatically on the user's behalf.
- Recording audio or video.
- Persisting transcript content to disk by default.
- Circumventing Microsoft Teams permissions, tenant policy, or meeting transcription settings.
- Supporting non-Edge browsers in the first version.
- Providing a polished long-term SDK API beyond the CLI-facing contracts needed for this feature.

## Target Domains

| Domain | Status | Relationship | Role in This Feature |
|--------|--------|--------------|----------------------|
| cli-shell | **NEW** | **create** | Own the command surface, argument parsing, exit-code behavior, and default human output. |
| output-presentation | **NEW** | **create** | Own human and JSON rendering over shared result/event DTOs. |
| teams-session | **NEW** | **create** | Represent the live Teams browser session and meeting state without exposing token internals to core logic. |
| transcript-stream | **NEW** | **create** | Represent live transcript/caption events and stream lifecycle. |
| external-adapters | **NEW** | **create** | Contain concrete browser/CDP/network integrations behind narrow ports. |

### New Domain Sketches

#### cli-shell [NEW]
- **Purpose**: Own the user-facing command-line contract for status checks, live transcript streaming, output mode selection, and process exit behavior.
- **Boundary Owns**: command names, flags, help text, exit codes, stdout/stderr routing.
- **Boundary Excludes**: Teams protocol details, transcript parsing, browser/CDP implementation.

#### output-presentation [NEW]
- **Purpose**: Convert command results and stream events into human-readable text or JSON.
- **Boundary Owns**: result envelope shape, JSON schema version, human summaries, error rendering.
- **Boundary Excludes**: business decisions about whether transcript data is available or how adapters connect.

#### teams-session [NEW]
- **Purpose**: Model whether a logged-in Teams tab is reachable, whether a meeting is active, and what live-session capabilities are observable.
- **Boundary Owns**: active Teams tab detection, meeting/call state, capability status.
- **Boundary Excludes**: raw CDP implementation and transcript event normalization.

#### transcript-stream [NEW]
- **Purpose**: Normalize live transcript/caption updates into stream events that the CLI can render.
- **Boundary Owns**: event shape, ordering metadata, stream lifecycle, unavailable/ended states.
- **Boundary Excludes**: browser attachment details, token storage, post-meeting transcript retrieval.

#### external-adapters [NEW]
- **Purpose**: Implement concrete access to external systems such as Edge CDP, Playwright, network observation, and future official APIs.
- **Boundary Owns**: connection mechanics, redaction, adapter-specific error mapping.
- **Boundary Excludes**: user-facing command semantics and presentation formatting.

## Testing Strategy

**Approach**: Hybrid — TDD for parsing, output, DTOs, and core logic; lightweight/manual validation for live Teams integration.

**Rationale**: CLI parsing, output wrappers, stream event normalization, and error mapping are deterministic and should be covered with automated tests. Live Teams integration depends on a browser profile, tenant policy, meeting state, and opaque network behavior, so it needs adapter contract tests plus manual validation against a real meeting.

**Focus Areas**:
- Argument parsing and `--json` behavior.
- Result envelope and event JSON schema.
- Human output for status, streaming, and errors.
- Exit-code mapping for common unavailable states.
- Transcript event normalization using fixtures captured from sanitized live observations.
- Adapter boundaries with targeted external-system fakes.

**Excluded**:
- Fully mocked end-to-end proof that claims real transcript extraction works.
- Persisted token replay tests.
- Tenant-wide Teams behavior guarantees.

**Mock Usage**: Allow targeted mocks limited to external systems such as Teams, CDP, browser/network streams, clocks, and process I/O. Prefer fixtures for transcript payload normalization once safe sanitized examples exist.

## Documentation Strategy

**Location**: Hybrid — README quick start plus deeper `docs/how/` usage.

**Rationale**: The CLI needs concise run instructions for local use and deeper operational notes for Edge remote debugging, privacy/safety expectations, output schemas, and live Teams limitations.

## Complexity

**Score**: CS-3 (medium)

**Breakdown**: S=1, I=2, D=0, N=2, F=1, T=1

**Confidence**: 0.72

**Assumptions**:
- The user will run the CLI locally against their own signed-in Edge profile.
- Teams meeting transcription/captions are enabled or visible in the meeting UI.
- The first version can rely on a live browser/CDP session rather than a fully browserless API.
- Transcript data can be observed without persisting sensitive token values.

**Dependencies**:
- A local Edge instance launched with remote debugging enabled.
- A signed-in Teams session and active meeting.
- Playwright/CDP access to the Teams tab.
- Discovery of the exact transcript/caption event source.

**Risks**:
- Teams may change internal transport or payload shape.
- Transcript/caption data may not be available when tenant or meeting settings disable it.
- Browser-derived auth/session data is sensitive and must not be logged or persisted accidentally.
- WebSocket payloads may be compressed, opaque, encrypted, or routed through internal SDK layers.

**Phases**:
0. Agent harness setup for Boot -> Interact -> Observe validation support.
1. CLI scaffold and output contract.
2. Teams session status adapter.
3. Live network/DOM observation adapter for transcript source discovery.
4. Transcript stream normalization and rendering.
5. Documentation and manual validation.

## Acceptance Criteria

1. Running the CLI with no command or `--help` displays human-readable usage.
2. Running the status command in human mode reports whether Edge CDP is reachable, whether a Teams tab is attached, and whether an active meeting is detected.
3. Running the status command with `--json` emits a valid JSON result envelope and no human prose on stdout.
4. Running the live transcript command in a supported active meeting emits transcript/caption events as they arrive.
5. Running the live transcript command with `--json` emits newline-delimited JSON events with stable fields for event type, text, speaker when available, timestamp/sequence metadata, and source status.
6. If Edge CDP is unavailable, the CLI exits non-zero with an actionable message in human mode and a structured error in JSON mode.
7. If Teams is reachable but no transcript/caption source is detected, the CLI exits or reports a clear unavailable state without claiming success.
8. The implementation does not persist browser tokens, cookies, or transcript content by default.
9. Core command logic does not print directly; all output flows through the output wrapper.
10. External Teams/browser/CDP access is isolated behind adapters that can be replaced by test fakes.
11. The first release requires Edge to already be running with a reachable local CDP endpoint and does not relaunch Edge automatically.

## Risks & Assumptions

- The live transcript source may be internal to Teams and not exposed through stable public browser APIs.
- Captions and transcripts may use different transports or event shapes.
- Some meetings may expose captions in the DOM but not in network payloads accessible to the CLI.
- Tenant policy and user permissions may prevent transcript access.
- A browser-controlled approach is safer initially than persisting tokens for browserless calls.
- Any future browserless mode should prefer official APIs where available and authorized.
- Agent harness setup is needed before implementation so browser/session validation can be repeated by agents.

## Open Questions

- Should human mode print transcript text directly, or only status/events until an explicit `stream` command is used?
- Should the CLI support redaction filters in the first version?

## Workshop Opportunities

| Topic | Type | Why Workshop | Key Questions |
|-------|------|--------------|---------------|
| Live transcript transport discovery | Integration Pattern | The exact Teams transcript/caption path is not yet confirmed. | Is the source DOM, WebSocket, fetch subscription, internal Teams SDK state, or official API? |
| Streaming output contract | API Contract | Live output must be automation-safe and human-readable. | NDJSON vs envelope? How are partial updates, speaker changes, corrections, and end-of-stream represented? |
| Privacy and session safety | Other | Teams content and browser session material are sensitive. | What is never logged? What may be persisted? How are tokens redacted? |

## Clarifications

### Session 2026-05-29

| Question | Answer |
|----------|--------|
| Workflow Mode | Simple — single-phase quick path |
| Testing Strategy | Hybrid — TDD for parsing/output/core logic, lightweight/manual for live Teams integration |
| Mock Usage | Allow targeted mocks limited to external systems like Teams/CDP/network |
| Documentation Strategy | Hybrid — README quick start plus docs/how deeper usage |
| Domain Review | Keep the proposed boundaries: cli-shell, output-presentation, teams-session, transcript-stream, and external-adapters |
| Agent Harness Readiness | Build agent harness as Phase 0 |
| JSON stream shape | Use newline-delimited JSON events / NDJSON |
| Edge/CDP startup model | Require pre-launched Edge/CDP for v1; do not relaunch Edge from the CLI |
