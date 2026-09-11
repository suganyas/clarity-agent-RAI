# Flight Plan: Teams Live Transcript CLI

**Status**: Landed  
**Spec**: `teams-live-transcript-cli-spec.md`  
**Plan**: `teams-live-transcript-cli-plan.md`  
**Generated**: 2026-05-29T11:24:55+10:00

## Mission

Create a local CLI that connects to an already-running Edge/Teams meeting session and streams live transcript/caption events with human output by default and NDJSON output via `--json`.

**Readiness Caveat**: READY means the implementation sequence is consumable; it does not prove Teams live transcript transport is already discovered. v1 must surface transcript discovery failure as `unavailable`.

## Current Decisions

- **Mode**: Simple.
- **Testing**: Hybrid; TDD for CLI/core/output, lightweight/manual for live Teams integration.
- **Mocks**: Targeted only for external systems.
- **Docs**: README quick start plus deeper `docs/how/` guidance.
- **Domains**: Keep separate cli-shell, output-presentation, teams-session, transcript-stream, and external-adapters boundaries.
- **Harness**: Include agent harness setup as Phase 0.
- **Runtime model**: v1 requires pre-launched Edge with local CDP enabled.
- **JSON stream**: NDJSON events.
- **CDP config**: default `http://127.0.0.1:9222`, override by `--cdp-endpoint` or `TEAMS_CDP_ENDPOINT`.
- **Stream lifecycle**: idle timeout defaults to `30000ms`; optional max duration and interrupt handling required.
- **No source behavior**: canonical `unavailable` outcome with exit code `20`.

## Planned Shape

1. Establish agent harness and minimal engineering substrate.
2. Create package/compiler scaffold and domain records.
3. Build CLI parser, help, entrypoint, composition root, and output renderers.
4. Define Teams session and transcript stream contracts/use cases with tests.
5. Implement redacted diagnostics, Edge CDP, Teams tab, and transcript probe adapters.
6. Wire real adapters, document usage, and validate with the manual runbook against an active Teams meeting.

## Key Risks

- Teams transcript transport may be unstable or opaque.
- Tenant or meeting policy may block transcripts/captions.
- Browser session material is sensitive and must not be logged or persisted.
- Live integration validation needs a real meeting.
- Stream commands must not hang indefinitely; timeout and interrupt behavior are part of v1.

## Gate Result

The implementation plan is **READY**. Gates G1, G5, G6, and G7 pass; G2, G3, and G4 are not applicable because no constitution, architecture rules, or ADRs exist yet.

## Flight Log

| Time | Event |
|------|-------|
| 2026-05-29T11:16:00+10:00 | Initial specifying flight plan created. |
| 2026-05-29T11:24:55+10:00 | Enriched from READY implementation plan. |
| 2026-05-29T11:32:34+10:00 | Validation fixes added: output schema, CDP config, stream lifecycle, manual runbook, redacted diagnostics, and readiness caveat. |
| 2026-05-29T11:36:53+10:00 | T001 in progress — creating agent harness doc and minimal engineering substrate commands. |
| 2026-05-29T11:37:56+10:00 | T001 complete — `just boot`, `just check`, `just interact`, and `just observe` passed. |
| 2026-05-29T11:37:56+10:00 | T002 in progress — creating package and compiler scaffold. |
| 2026-05-29T11:38:29+10:00 | T002 complete — npm dependencies installed; `just boot`, `just check`, `just interact`, and `just observe` passed. |
| 2026-05-29T11:40:15+10:00 | T003 in progress — creating domain registry, domain map, and five domain docs. |
| 2026-05-29T11:41:10+10:00 | T003 complete — domains registered; `just check` passed. |
| 2026-05-29T11:41:10+10:00 | T004 in progress — writing CLI parser tests. |
| 2026-05-29T11:42:28+10:00 | T004 complete — parser tests written; red state confirmed because `src/cli/args.ts` is not implemented yet. |
| 2026-05-29T11:42:28+10:00 | T005 in progress — implementing parser, help, main entrypoint, and bootstrap. |
| 2026-05-29T11:43:28+10:00 | T005 complete — parser/help/bootstrap implemented; `just check`, `just interact`, and `just observe` passed. |
| 2026-05-29T11:43:28+10:00 | T006 in progress — writing output renderer tests. |
| 2026-05-29T11:43:52+10:00 | T006 complete — output renderer tests written; red state confirmed because output modules are not implemented yet. |
| 2026-05-29T11:43:52+10:00 | T007 in progress — implementing result envelopes and renderers. |
| 2026-05-29T11:44:19+10:00 | T007 complete — output result envelope and renderers implemented; `just check` passed. |
| 2026-05-29T11:44:19+10:00 | T008 in progress — writing status command tests with fake session adapter. |
| 2026-05-29T11:44:43+10:00 | T008 complete — status command tests written; red state confirmed because status use case is not implemented yet. |
| 2026-05-29T11:44:43+10:00 | T009 in progress — implementing Teams session port, types, and status use case. |
| 2026-05-29T11:45:17+10:00 | T009 complete — status port/types/use case implemented; `just check` passed. |
| 2026-05-29T11:45:17+10:00 | T010 in progress — writing transcript event and stream command tests. |
| 2026-05-29T11:45:45+10:00 | T010 complete — stream tests written; red state confirmed because stream modules are not implemented yet. |
| 2026-05-29T11:45:45+10:00 | T011 in progress — implementing transcript events, source port, normalizer, and stream use case. |
| 2026-05-29T11:46:15+10:00 | T011 complete — transcript event DTOs, port, normalizer, and stream use case implemented; `just check` passed. |
| 2026-05-29T11:46:15+10:00 | T012 in progress — writing redaction and diagnostics tests. |
| 2026-05-29T11:46:41+10:00 | T012 complete — redaction tests written; red state confirmed because redaction modules are not implemented yet. |
| 2026-05-29T11:46:41+10:00 | T013 in progress — implementing redaction utility and typed diagnostics wrapper. |
| 2026-05-29T11:47:14+10:00 | T013 complete — redaction utility and diagnostics wrapper implemented; `just check` passed. |
| 2026-05-29T11:47:14+10:00 | T014 in progress — implementing Edge CDP client and Teams tab adapter. |
| 2026-05-29T11:48:02+10:00 | T014 complete — Edge CDP client and Teams tab adapter implemented; `just check` passed. |
| 2026-05-29T11:48:02+10:00 | T015 in progress — implementing transcript probe adapter. |
| 2026-05-29T11:48:31+10:00 | T015 complete — transcript probe adapter implemented; `just check` passed. |
| 2026-05-29T11:48:31+10:00 | T016 in progress — wiring real adapters into composition root. |
| 2026-05-29T11:49:02+10:00 | T016 complete — real adapters wired; `just check` and CDP-unreachable JSON smoke path passed. |
| 2026-05-29T11:49:02+10:00 | T017 in progress — writing README and how-to documentation. |
| 2026-05-29T11:50:07+10:00 | T017 complete — README and how-to docs written; `just check` passed. |
| 2026-05-29T11:50:21+10:00 | T018 in progress — running automated and live-safe validation. |
| 2026-05-29T11:51:14+10:00 | T018 complete — automated checks passed; live status detected Edge/Teams/meeting; stream JSON produced transcript event categories without printing content. |
| 2026-05-29T11:51:14+10:00 | Landed — all implementation tasks complete. |
