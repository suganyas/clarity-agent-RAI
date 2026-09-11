# Domain: output-presentation

## Purpose

Own all user-visible rendering contracts for human output, JSON result envelopes, NDJSON stream events, and structured errors.

## Boundary

**Owns**: result envelope shape, NDJSON event rendering, human output, error formatting, stdout/stderr policy.  
**Excludes**: command decisions, Teams session detection, transcript source probing.

## Source Location

| Path | Role |
|------|------|
| `src/output/` | Public output contracts and renderers |
| `tests/output/` | Renderer contract tests |

## Concepts

| Concept | Entry Point | What It Does |
|---------|-------------|--------------|
| Result envelope | `createResultEnvelope` | Wraps non-stream command results and errors. |
| Human rendering | `renderHuman` | Produces readable CLI output. |
| NDJSON rendering | `renderNdjsonEvent` | Converts stream events to one JSON object per line. |

## Contracts

| Contract | Type | Description |
|----------|------|-------------|
| JSON result envelope | public | Stable non-stream JSON output schema. |
| NDJSON stream event | public | Stable stream event line schema. |
| Human renderer | public | Text output for humans; no raw secrets. |

## Composition

| Component | Path | Notes |
|-----------|------|-------|
| Result types | `src/output/result.ts` | Shared by renderers and app commands. |
| Human renderer | `src/output/human.ts` | Human default. |
| JSON renderer | `src/output/json.ts` | JSON and NDJSON. |

## Dependencies

| This Domain Depends On | Why |
|------------------------|-----|
| transcript-stream | Renders stream event DTOs. |
| teams-session | Renders status DTOs. |

## History

| Plan | Change | Date |
|------|--------|------|
| 002-teams-live-transcript-cli | Created domain sketch and registry entry. | 2026-05-29 |
