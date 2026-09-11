# Domain: cli-shell

## Purpose

Own the user-facing command-line contract: commands, flags, configuration precedence, process lifecycle, stdout/stderr routing, and exit-code mapping.

## Boundary

**Owns**: CLI entrypoint, argument parsing, help text, command dispatch, configuration resolution, bootstrap wiring.  
**Excludes**: rendering internals, Teams browser protocol, transcript normalization, raw external diagnostics.

## Source Location

| Path | Role |
|------|------|
| `src/cli/` | CLI entrypoint, parser, help text |
| `src/bootstrap.ts` | Composition root |
| `justfile` | Local engineering substrate commands |

## Concepts

| Concept | Entry Point | What It Does |
|---------|-------------|--------------|
| Command dispatch | `src/cli/main.ts` | Converts process argv into a command execution path. |
| Argument parsing | `parseArgs` | Normalizes commands, flags, and configuration inputs. |
| Composition root | `createApp` | Wires command handlers to ports and adapters. |

## Contracts

| Contract | Type | Description |
|----------|------|-------------|
| CLI command contract | public | `help`, `status`, and `stream` command semantics. |
| Parsed args | public | Structured command request consumed by app commands. |

## Composition

| Component | Path | Notes |
|-----------|------|-------|
| CLI entrypoint | `src/cli/main.ts` | Thin process boundary. |
| Parser | `src/cli/args.ts` | No external side effects. |
| Bootstrap | `src/bootstrap.ts` | Wires real adapters by default. |

## Dependencies

| This Domain Depends On | Why |
|------------------------|-----|
| output-presentation | Render command results. |
| teams-session | Execute `status`. |
| transcript-stream | Execute `stream`. |

## History

| Plan | Change | Date |
|------|--------|------|
| 002-teams-live-transcript-cli | Created domain sketch and registry entry. | 2026-05-29 |
