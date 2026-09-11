# Domain Registry

| Domain | Status | Purpose | Public Contracts |
|--------|--------|---------|------------------|
| cli-shell | active | Owns command parsing, process lifecycle, configuration resolution, and exit behavior. | CLI commands, parsed args, bootstrap wiring |
| output-presentation | active | Owns human, JSON, and NDJSON rendering contracts. | result envelope, stream event rendering |
| teams-session | active | Owns active Teams tab and meeting-state capability diagnostics. | Teams session port and status DTOs |
| transcript-stream | active | Owns transcript/caption stream event contracts and normalization. | transcript source port and event DTOs |
| external-adapters | active | Owns concrete Edge CDP, Teams browser, probe, and redacted diagnostic integrations. | adapter diagnostics and concrete ports implementations |

## Health Summary

| Domain | Health | Notes |
|--------|--------|-------|
| cli-shell | implemented | CLI parser, entrypoint, bootstrap, docs, and harness exist. |
| output-presentation | implemented | JSON envelope, NDJSON, and human renderers exist. |
| teams-session | implemented | Session port, status DTO, status use case, and Teams tab adapter exist. |
| transcript-stream | implemented | Event DTOs, source port, normalizer, stream use case, and probe adapter exist. |
| external-adapters | implemented | Edge CDP client, Teams tab/probe adapters, redaction, and diagnostics exist. |
