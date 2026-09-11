# Domain: transcript-stream

## Purpose

Normalize live transcript/caption source observations into stable stream lifecycle and transcript events.

## Boundary

**Owns**: transcript event DTOs, source port, normalization, unavailable/error/end semantics.  
**Excludes**: browser attachment, Teams tab discovery, rendering, persistence.

## Source Location

| Path | Role |
|------|------|
| `src/domain/transcript-stream/` | Event DTOs and normalization |
| `src/ports/transcript-source.ts` | Public transcript source port |
| `tests/domain/transcript-events.test.ts` | Event/normalization tests |
| `tests/app/stream.test.ts` | Stream use-case tests |

## Concepts

| Concept | Entry Point | What It Does |
|---------|-------------|--------------|
| Transcript event stream | `TranscriptSource.stream` | Provides normalized live transcript events. |
| Event normalization | `normalizeTranscriptObservation` | Converts safe source observations into stable events. |
| Unavailable state | `unavailable` event | Reports no supported source without claiming success. |

## Contracts

| Contract | Type | Description |
|----------|------|-------------|
| `TranscriptSource` | public | Interface implemented by transcript probe adapters. |
| `TranscriptEvent` | public | NDJSON-compatible stream event DTO. |

## Composition

| Component | Path | Notes |
|-----------|------|-------|
| Stream command | `src/app/commands/stream.ts` | Uses transcript source port. |
| Event types | `src/domain/transcript-stream/events.ts` | Public event schema. |
| Normalizer | `src/domain/transcript-stream/normalize.ts` | Fixture-backed transformation. |

## Dependencies

| This Domain Depends On | Why |
|------------------------|-----|
| external-adapters | Concrete transcript source implementation. |

## History

| Plan | Change | Date |
|------|--------|------|
| 002-teams-live-transcript-cli | Created domain sketch and registry entry. | 2026-05-29 |
