# Domain: external-adapters

## Purpose

Contain concrete integrations with Edge CDP, Teams browser state, transcript probing, and redacted diagnostics.

## Boundary

**Owns**: Edge CDP connection, Teams tab adapter, transcript probe adapter, redaction and diagnostics utilities.  
**Excludes**: command semantics, output rendering, domain event contracts.

## Source Location

| Path | Role |
|------|------|
| `src/adapters/edge-cdp/` | Edge CDP client |
| `src/adapters/teams/` | Teams tab and transcript probe adapters |
| `src/adapters/security/` | Redaction and typed diagnostics |
| `tests/adapters/` | Adapter security tests |

## Concepts

| Concept | Entry Point | What It Does |
|---------|-------------|--------------|
| Edge CDP connection | `EdgeCdpClient` | Connects to pre-launched local Edge CDP. |
| Teams tab detection | `TeamsTabAdapter` | Finds Teams tab and meeting controls. |
| Transcript probing | `TranscriptProbeAdapter` | Observes safe DOM/network/WebSocket candidates. |
| Redacted diagnostics | `createRedactedDiagnostic` | Prevents secret/raw content leakage. |

## Contracts

| Contract | Type | Description |
|----------|------|-------------|
| Redacted diagnostics | public | Only safe adapter metadata may leave adapters. |
| Teams session adapter | internal | Implements `TeamsSessionPort`. |
| Transcript probe adapter | internal | Implements `TranscriptSource`. |

## Composition

| Component | Path | Notes |
|-----------|------|-------|
| Edge CDP client | `src/adapters/edge-cdp/edgeCdpClient.ts` | Runtime integration. |
| Teams tab adapter | `src/adapters/teams/teamsTabAdapter.ts` | Session port implementation. |
| Transcript probe | `src/adapters/teams/transcriptProbeAdapter.ts` | Transcript source implementation. |
| Redaction | `src/adapters/security/redaction.ts` | Security boundary. |
| Diagnostics | `src/adapters/security/diagnostics.ts` | Typed redacted diagnostics. |

## Dependencies

| This Domain Depends On | Why |
|------------------------|-----|
| teams-session | Implements the public session port. |
| transcript-stream | Implements the public transcript source port. |

## History

| Plan | Change | Date |
|------|--------|------|
| 002-teams-live-transcript-cli | Created domain sketch and registry entry. | 2026-05-29 |
