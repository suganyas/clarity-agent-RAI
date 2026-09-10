from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .analyzer import Clarification


_CONTEXT_DOCUMENTS = (
    "summary.md",
    "goal/problem.md",
    "goal/stakeholders.md",
    "goal/requirements.md",
    "solution/solution.md",
    "solution/architecture.md",
    "failures/failures.md",
    "decisions/decisions.md",
)


@dataclass(frozen=True)
class ProtocolContext:
    protocol_dir: Path
    documents: dict[str, str]

    @property
    def missing_documents(self) -> tuple[str, ...]:
        return tuple(path for path in _CONTEXT_DOCUMENTS if path not in self.documents)


def load_protocol_context(project_dir: Path) -> ProtocolContext:
    protocol_dir = project_dir.resolve() / ".clarity-protocol"
    documents: dict[str, str] = {}
    for relative_path in _CONTEXT_DOCUMENTS:
        path = protocol_dir / relative_path
        if path.is_file():
            documents[relative_path] = path.read_text(encoding="utf-8")
    return ProtocolContext(protocol_dir=protocol_dir, documents=documents)


class ProtocolRecorder:
    """Append interventions to a protocol artifact without storing meeting speech."""

    def __init__(self, context: ProtocolContext) -> None:
        self._path = context.protocol_dir / "rai-meeting-observations.md"

    @property
    def path(self) -> Path:
        return self._path

    def record(self, clarification: Clarification) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.write_text(
                "# Responsible AI Meeting Observations\n\n"
                "Questions and practices surfaced during meetings. Raw transcript text is not stored.\n",
                encoding="utf-8",
            )
        recorded_at = datetime.now(timezone.utc).isoformat()
        with self._path.open("a", encoding="utf-8") as stream:
            stream.write(
                f"\n## {clarification.category} ({recorded_at})\n\n"
                f"**Persona:** {clarification.persona}\n\n"
                f"**Threat category:** {clarification.threat_category or 'Not identified'}\n\n"
                f"**Risk indicator:** {clarification.risk_indicator}\n\n"
                f"**Question:** {clarification.question}\n\n"
                f"**Suggested practice:** {clarification.practice}\n\n"
                f"**Impact assessment note:** {clarification.impact_assessment_note}\n\n"
                f"Source event: sequence {clarification.sequence} at {clarification.timestamp}.\n"
            )