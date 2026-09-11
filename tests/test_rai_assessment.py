"""Tests for structured Responsible AI impact assessment recording."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from clarity_agent.ai_actions import format_tools_as_cli
from clarity_agent.ai_actions.rai_assessment import (
    MAX_PROJECT_PLAN_BYTES,
    ProjectPlanError,
    format_project_plan_context,
    load_project_plan,
    record_rai_impact_assessment,
    render_rai_impact_assessment,
)


def _assessment() -> dict[str, object]:
    return {
        "project_summary": "An AI assistant routes volunteer requests.",
        "intended_uses": ["Suggest request categories"],
        "prohibited_uses": ["Reject requests without review"],
        "affected_people": ["Volunteers", "People requesting help"],
        "risks": [
            {
                "harm": "Urgent requests receive delayed support",
                "affected_people": "People requesting help",
                "scenario": "The model assigns a low-priority category",
                "likelihood": "medium",
                "severity": "high",
                "mitigation": "Require volunteer review",
                "owner": "Demo lead",
                "evidence": "Urgent test requests always reach review",
                "state": "planned",
            }
        ],
        "release_conditions": ["Test urgent request examples"],
        "monitoring_and_response": ["Keep a manual routing fallback"],
        "open_questions": ["Who maintains the test set?"],
    }


def test_given_valid_project_plan_when_loaded_then_returns_delimited_context(
    tmp_path: Path,
) -> None:
    # Arrange
    plan = "# Plan\n\nUse AI to route volunteer requests."
    (tmp_path / "project-plan.md").write_text(plan, encoding="utf-8")

    # Act
    context = format_project_plan_context(load_project_plan(tmp_path))

    # Assert
    assert context.endswith(f"{plan}\n</project-plan-data>")


def test_given_rai_tool_when_formatted_for_sdk_then_includes_record_command() -> None:
    # Arrange
    from clarity_agent.ai_actions.rai_assessment import create_rai_assessment_tools

    # Act
    result = format_tools_as_cli(create_rai_assessment_tools())

    # Assert
    assert "python -m clarity_agent.ai_actions.rai_assessment record" in result


@pytest.mark.parametrize(
    ("content", "message"),
    [
        (b"", "empty"),
        (b"\xff\xfe", "valid UTF-8"),
        (b"x" * (MAX_PROJECT_PLAN_BYTES + 1), "too large"),
    ],
)
def test_given_invalid_project_plan_when_loaded_then_raises_actionable_error(
    tmp_path: Path, content: bytes, message: str
) -> None:
    # Arrange
    (tmp_path / "project-plan.md").write_bytes(content)

    # Act and assert
    with pytest.raises(ProjectPlanError, match=message):
        load_project_plan(tmp_path)


def test_given_valid_assessment_when_rendered_then_produces_stable_markdown() -> None:
    # Act
    result = render_rai_impact_assessment(
        **_assessment(), assessed_on=date(2026, 9, 11)  # type: ignore[arg-type]
    )

    # Assert
    assert "**Last assessed:** 2026-09-11" in result
    assert "| Medium | High |" in result
    assert result.endswith("substitute for specialist review.\n")


def test_given_table_delimiters_when_rendered_then_escapes_cells() -> None:
    # Arrange
    assessment = _assessment()
    assessment["risks"][0]["harm"] = "Delay | denial"  # type: ignore[index]

    # Act
    result = render_rai_impact_assessment(
        **assessment, assessed_on=date(2026, 9, 11)  # type: ignore[arg-type]
    )

    # Assert
    assert "Delay \\| denial" in result


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("likelihood", "certain", "likelihood must be low, medium, or high"),
        ("severity", "critical", "severity must be low, medium, or high"),
        ("state", "done", "state must be one of"),
    ],
)
def test_given_invalid_risk_value_when_rendered_then_raises_value_error(
    field: str, value: str, message: str
) -> None:
    # Arrange
    assessment = _assessment()
    assessment["risks"][0][field] = value  # type: ignore[index]

    # Act and assert
    with pytest.raises(ValueError, match=message):
        render_rai_impact_assessment(
            **assessment, assessed_on=date(2026, 9, 11)  # type: ignore[arg-type]
        )


def test_given_no_prioritized_risks_when_rendered_then_raises_value_error() -> None:
    # Arrange
    assessment = _assessment()
    assessment["risks"] = []

    # Act and assert
    with pytest.raises(ValueError, match="at least one prioritized risk"):
        render_rai_impact_assessment(
            **assessment, assessed_on=date(2026, 9, 11)  # type: ignore[arg-type]
        )


def test_given_protocol_directory_when_recorded_then_uses_fixed_path(
    tmp_path: Path,
) -> None:
    # Act
    path, message = record_rai_impact_assessment(
        tmp_path, **_assessment()  # type: ignore[arg-type]
    )

    # Assert
    assert path == tmp_path / "rai-impact-assessment.md"
    assert message == "Recorded RAI impact assessment: rai-impact-assessment.md"
