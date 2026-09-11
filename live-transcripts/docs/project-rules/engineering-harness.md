# Engineering Harness

**Maturity**: L2 — boot, check, interact, and observe are defined for local CLI work.

## Purpose

Provide the agent feedback loop for the Teams live transcript CLI:

1. **Boot**: confirm the local project substrate is present.
2. **Interact**: run a harmless CLI-facing command.
3. **Observe**: capture deterministic validation evidence.

This harness is intentionally local. It does not join Teams meetings, launch Edge, or inspect transcript content.

## Commands

| Capability | Command | Expected Result |
|------------|---------|-----------------|
| Boot | `just boot` | Prints project readiness and confirms required local files exist. |
| Health Check | `just check` | Runs available automated checks; before package install it verifies scaffold files. |
| Interact | `just interact` | Runs the CLI help path when implemented, otherwise reports scaffold readiness. |
| Observe | `just observe` | Writes a small JSON evidence file under `.harness/observe.json`. |

## Boot

Run:

```bash
just boot
```

Healthy output includes the project root and a readiness line.

## Interact

Run:

```bash
just interact
```

This command is safe before the CLI exists. Once `package.json` and the CLI entrypoint exist, it exercises the help path.

## Observe

Run:

```bash
just observe
```

Evidence is written to `.harness/observe.json` and must not include browser tokens, cookies, raw transcript text, or raw Teams network payloads.

## Validation

Run:

```bash
just check
```

`just check` is the default local validation command for implementation work. It should remain fast and deterministic.

## Safety Rules

- Do not persist Teams auth tokens, cookies, or raw transcript content.
- Use redacted diagnostics for browser/CDP failures.
- Keep live Teams validation manual and explicit.
- Prefer deterministic tests for CLI parsing, rendering, and domain logic.

## History

| Plan | Change | Date |
|------|--------|------|
| 002-teams-live-transcript-cli | Created L2 local CLI harness for boot, interact, observe, and validation. | 2026-05-29 |
