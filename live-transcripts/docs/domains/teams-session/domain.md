# Domain: teams-session

## Purpose

Represent whether the CLI can reach Edge CDP, find a Teams tab, and detect an active Teams meeting with useful capabilities.

## Boundary

**Owns**: Teams session status DTOs, meeting-state model, capability flags, session port.  
**Excludes**: concrete CDP/Playwright mechanics, transcript event parsing, rendering.

## Source Location

| Path | Role |
|------|------|
| `src/domain/teams-session/` | Status DTOs and domain types |
| `src/ports/teams-session.ts` | Public session port |
| `tests/app/status.test.ts` | Status use-case tests |

## Concepts

| Concept | Entry Point | What It Does |
|---------|-------------|--------------|
| Teams session status | `TeamsSessionPort.getStatus` | Reports CDP, Teams tab, and active meeting state. |
| Meeting capability diagnostics | `TeamsSessionStatus` | Describes available meeting controls and transcript readiness indicators. |

## Contracts

| Contract | Type | Description |
|----------|------|-------------|
| `TeamsSessionPort` | public | Interface implemented by external adapters. |
| `TeamsSessionStatus` | public | Status command data contract. |

## Composition

| Component | Path | Notes |
|-----------|------|-------|
| Status command | `src/app/commands/status.ts` | Uses the public port only. |
| Session types | `src/domain/teams-session/types.ts` | Stable DTOs. |

## Dependencies

| This Domain Depends On | Why |
|------------------------|-----|
| external-adapters | Concrete implementation of public port. |

## History

| Plan | Change | Date |
|------|--------|------|
| 002-teams-live-transcript-cli | Created domain sketch and registry entry. | 2026-05-29 |
