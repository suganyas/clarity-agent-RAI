from __future__ import annotations

from dataclasses import asdict, dataclass
import re
from typing import Any


@dataclass(frozen=True)
class Clarification:
    category: str
    question: str
    practice: str
    sequence: int
    timestamp: str
    context: str | None = None
    persona: str = "RAI Clarity Advisor"
    impact_assessment_note: str = ""
    threat_category: str | None = None
    risk_indicator: str = "safety_reliability"

    def as_event(self) -> dict[str, Any]:
        return {"schemaVersion": 1, "event": "rai-clarification", **asdict(self)}


@dataclass(frozen=True)
class _Rule:
    category: str
    pattern: re.Pattern[str]
    question: str
    practice: str


_RULES = (
    _Rule(
        "purpose-and-scope",
        re.compile(r"\b(use case|goal|scope|automate|assistant|copilot|ai system|model)\b", re.I),
        "What is this AI system allowed to do, and which uses should be explicitly prohibited?",
        "Document intended users, intended uses, foreseeable misuse, and out-of-scope uses.",
    ),
    _Rule(
        "affected-people",
        re.compile(r"\b(user|customer|employee|candidate|patient|student|community|stakeholder)\w*\b", re.I),
        "Who could be affected without being represented in this decision, especially vulnerable groups?",
        "Map direct and indirect stakeholders and include affected representatives in review.",
    ),
    _Rule(
        "data-and-privacy",
        re.compile(r"\b(data|dataset|training set|personal|pii|recording|transcript|consent|retain)\w*\b", re.I),
        "Do we have a lawful, consent-aware basis for this data, and what is the minimum data we need?",
        "Record provenance and consent, minimize collection, set retention limits, and restrict access.",
    ),
    _Rule(
        "fairness",
        re.compile(r"\b(fair|bias|segment|demographic|group|language|region|discriminat)\w*\b", re.I),
        "Which groups could experience meaningfully different error rates or outcomes?",
        "Define subgroup metrics with affected stakeholders and test them before and after release.",
    ),
    _Rule(
        "human-oversight",
        re.compile(r"\b(decide|decision|approve|reject|recommend|score|rank|review|human)\w*\b", re.I),
        "Which decisions require meaningful human judgment, and how can a person challenge the result?",
        "Assign accountable decision owners and provide review, override, and appeal paths.",
    ),
    _Rule(
        "transparency",
        re.compile(r"\b(explain|transparent|disclose|notify|label|reason|confidence)\w*\b", re.I),
        "What should people be told about AI involvement, limitations, and the basis for an outcome?",
        "Provide plain-language disclosure, calibrated uncertainty, and decision-relevant explanations.",
    ),
    _Rule(
        "evaluation",
        re.compile(r"\b(test|metric|accuracy|quality|benchmark|evaluate|success|threshold)\w*\b", re.I),
        "What evidence and thresholds would justify deployment, and what result would stop it?",
        "Predefine task, safety, and subgroup acceptance criteria using representative evaluations.",
    ),
    _Rule(
        "monitoring-and-response",
        re.compile(r"\b(monitor|production|launch|deploy|drift|incident|feedback|rollback)\w*\b", re.I),
        "How will we detect harmful behavior after launch, and who has authority to pause the system?",
        "Monitor impacts and drift, provide feedback channels, and rehearse incident and rollback plans.",
    ),
)

_RISK_METADATA = {
    "purpose-and-scope": ("Misuse escalation", "rights_fairness_privacy"),
    "affected-people": ("Bias amplification", "rights_fairness_privacy"),
    "data-and-privacy": ("Privacy leakage", "rights_fairness_privacy"),
    "fairness": ("Bias amplification", "rights_fairness_privacy"),
    "human-oversight": ("Output manipulation", "rights_fairness_privacy"),
    "transparency": ("Output manipulation", "security_explainability"),
    "evaluation": ("Model evasion", "safety_reliability"),
    "monitoring-and-response": ("Misuse escalation", "safety_reliability"),
}


def default_risk_metadata(category: str) -> tuple[str | None, str]:
    return _RISK_METADATA.get(category, (None, "safety_reliability"))


class RAIClarifier:
    """Turn stable transcript events into deduplicated RAI interventions."""

    def __init__(self, *, max_per_event: int = 2) -> None:
        if max_per_event < 1:
            raise ValueError("max_per_event must be at least 1")
        self._max_per_event = max_per_event
        self._raised_categories: set[str] = set()

    def process(self, event: dict[str, Any]) -> list[Clarification]:
        if event.get("schemaVersion") != 1:
            return []
        if event.get("event") not in {"transcript", "correction"}:
            return []
        text = event.get("text")
        if not isinstance(text, str) or not text.strip():
            return []

        sequence = event.get("sequence")
        timestamp = event.get("timestamp")
        if not isinstance(sequence, int) or not isinstance(timestamp, str):
            return []

        clarifications: list[Clarification] = []
        for rule in _RULES:
            if rule.category in self._raised_categories or not rule.pattern.search(text):
                continue
            self._raised_categories.add(rule.category)
            threat_category, risk_indicator = default_risk_metadata(rule.category)
            clarifications.append(
                Clarification(
                    category=rule.category,
                    question=rule.question,
                    practice=rule.practice,
                    sequence=sequence,
                    timestamp=timestamp,
                    impact_assessment_note=(
                        "Assess the potential impacts and retain evidence that this action is "
                        f"implemented and effective: {rule.practice}"
                    ),
                    threat_category=threat_category,
                    risk_indicator=risk_indicator,
                )
            )
            if len(clarifications) >= self._max_per_event:
                break
        return clarifications