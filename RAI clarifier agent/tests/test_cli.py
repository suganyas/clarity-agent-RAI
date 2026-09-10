from __future__ import annotations

import io
import json
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import patch

from rai_clarifier.analyzer import RAIClarifier
from rai_clarifier.cli import _run_live, process_lines, run
from rai_clarifier.llm_analyzer import CopilotRAIAnalyzer
from rai_clarifier.protocol import ProtocolRecorder, load_protocol_context


class FakeBackend:
    def __init__(self, response: str) -> None:
        self.response = response
        self.messages: list[str] = []
        self.disconnected = False

    def chat(self, user_message: str, system_prompt: str | None = None, *, model: str | None = None) -> str:
        self.messages.append(user_message)
        return self.response

    def disconnect(self) -> None:
        self.disconnected = True


class FakeProcess:
    def __init__(self, stdout: object, exit_code: int = 0) -> None:
        self.stdout = stdout
        self.exit_code = exit_code
        self.terminated = False

    def wait(self) -> int:
        return self.exit_code

    def terminate(self) -> None:
        self.terminated = True


class InterruptingLines:
    def __iter__(self):
        raise KeyboardInterrupt


class CLITests(unittest.TestCase):
    def test_streams_ndjson_clarifications(self) -> None:
        transcript = json.dumps(
            {
                "schemaVersion": 1,
                "event": "transcript",
                "sequence": 1,
                "timestamp": "2026-08-11T12:00:00Z",
                "source": "dom",
                "text": "We need accuracy metrics before deployment.",
            }
        )
        output = io.StringIO()

        exit_code = process_lines(
            [transcript], recorder=None, json_output=True, stdout=output
        )

        events = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(exit_code, 0)
        self.assertTrue(events)
        self.assertTrue(all(event["event"] == "rai-clarification" for event in events))

    def test_appends_responses_to_output_file_without_raw_transcript(self) -> None:
        raw_text = "Confidential customer data needs a retention policy."
        transcript = json.dumps(
            {
                "schemaVersion": 1,
                "event": "transcript",
                "sequence": 1,
                "timestamp": "2026-08-11T12:00:00Z",
                "source": "dom",
                "text": raw_text,
            }
        )

        with tempfile.TemporaryDirectory() as directory:
            output_path = Path(directory) / "reports" / "rai-responses.ndjson"
            exit_code = run(
                [
                    "--project-dir",
                    directory,
                    "--output-file",
                    str(output_path),
                    "--json",
                ],
                stdin=io.StringIO(transcript),
                stdout=io.StringIO(),
            )
            events = [json.loads(line) for line in output_path.read_text(encoding="utf-8").splitlines()]

        self.assertEqual(exit_code, 0)
        self.assertEqual(len(events), 2)
        self.assertTrue(all(event["event"] == "rai-clarification" for event in events))
        self.assertTrue(all(event["impact_assessment_note"] for event in events))
        self.assertTrue(all(event["threat_category"] for event in events))
        self.assertTrue(all(event["risk_indicator"] for event in events))
        self.assertNotIn(raw_text, json.dumps(events))

    def test_flushes_response_file_while_writer_remains_open(self) -> None:
        transcript = json.dumps(
            {
                "schemaVersion": 1,
                "event": "transcript",
                "sequence": 1,
                "timestamp": "2026-08-11T12:00:00Z",
                "source": "dom",
                "text": "We need accuracy metrics before deployment.",
            }
        )

        with tempfile.TemporaryDirectory() as directory:
            output_path = Path(directory) / "rai-responses.txt"
            with output_path.open("a", encoding="utf-8") as output_file:
                process_lines(
                    [transcript],
                    recorder=None,
                    json_output=False,
                    stdout=io.StringIO(),
                    output_file=output_file,
                )
                persisted = output_path.read_text(encoding="utf-8")

        self.assertIn("RAI Clarity Advisor", persisted)
        self.assertIn("Question:", persisted)
        self.assertIn("Impact assessment note:", persisted)
        self.assertIn("Threat category:", persisted)
        self.assertIn("Risk indicator:", persisted)

    def test_records_interventions_without_raw_transcript(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project_dir = Path(directory)
            protocol_dir = project_dir / ".clarity-protocol"
            protocol_dir.mkdir()
            recorder = ProtocolRecorder(load_protocol_context(project_dir))
            raw_text = "secret customer data should be retained"
            transcript = json.dumps(
                {
                    "schemaVersion": 1,
                    "event": "transcript",
                    "sequence": 1,
                    "timestamp": "2026-08-11T12:00:00Z",
                    "source": "dom",
                    "text": raw_text,
                }
            )

            process_lines([transcript], recorder=recorder, json_output=True, stdout=io.StringIO())

            recorded = recorder.path.read_text(encoding="utf-8")
            self.assertNotIn(raw_text, recorded)
            self.assertIn("Suggested practice", recorded)
            self.assertIn("Impact assessment note", recorded)
            self.assertIn("Threat category", recorded)
            self.assertIn("Risk indicator", recorded)

    def test_batches_captions_until_configured_check_interval(self) -> None:
        lines = [
            json.dumps(
                {
                    "schemaVersion": 1,
                    "event": "transcript",
                    "sequence": sequence,
                    "timestamp": f"2026-08-11T12:0{sequence}:00Z",
                    "source": "dom",
                    "text": text,
                }
            )
            for sequence, text in ((1, "customer data"), (2, "accuracy before deployment"))
        ]
        output = io.StringIO()
        ticks = iter((0, 60, 301, 301, 301))

        process_lines(
            lines,
            recorder=None,
            json_output=True,
            stdout=output,
            check_interval_seconds=300,
            clock=lambda: next(ticks),
        )

        events = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0]["sequence"], 2)

    def test_refuses_recording_without_initialized_protocol(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            exit_code = run(
                ["--project-dir", directory, "--record-protocol"],
                stdin=io.StringIO(),
                stdout=io.StringIO(),
            )

        self.assertEqual(exit_code, 2)

    def test_copilot_analyzer_validates_and_deduplicates_output(self) -> None:
        raw_text = "The model will reject candidates automatically."
        status_messages: list[str] = []
        backend = FakeBackend(
            json.dumps(
                {
                    "clarifications": [
                        {
                            "persona": "Human Oversight Lead",
                            "category": "human-oversight",
                            "context": "Automated rejection can materially affect access to employment.",
                            "question": "Who can override this decision?",
                            "practice": "Assign an accountable reviewer and an appeal path.",
                            "impactAssessmentNote": "Assess review and appeal controls and retain evidence of overrides.",
                            "threatCategory": "Bias amplification",
                            "riskIndicator": "rights_fairness_privacy",
                        }
                    ]
                }
            )
        )
        analyzer = CopilotRAIAnalyzer(
            backend,
            protocol_documents={"goal/problem.md": "A hiring assistant."},
            status=status_messages.append,
        )
        transcript = json.dumps(
            {
                "schemaVersion": 1,
                "event": "transcript",
                "sequence": 7,
                "timestamp": "2026-08-11T12:00:00Z",
                "source": "dom",
                "text": raw_text,
            }
        )
        output = io.StringIO()

        process_lines(
            [transcript, transcript],
            recorder=None,
            json_output=True,
            stdout=output,
            analyzer=analyzer,
        )

        events = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["category"], "human-oversight")
        self.assertIn("materially affect", events[0]["context"])
        self.assertEqual(events[0]["persona"], "Human Oversight Lead")
        self.assertIn("review and appeal", events[0]["impact_assessment_note"])
        self.assertEqual(events[0]["threat_category"], "Bias amplification")
        self.assertEqual(events[0]["risk_indicator"], "rights_fairness_privacy")
        self.assertIn("transcriptExcerpt", backend.messages[0])
        self.assertTrue(any("Sending RAI analysis request #1" in message for message in status_messages))
        self.assertTrue(any("model returned 1; 0 rejected" in message for message in status_messages))
        self.assertTrue(any("1 RAI suggestion(s) accepted" in message for message in status_messages))
        self.assertTrue(all(raw_text not in message for message in status_messages))

    def test_copilot_allows_new_question_in_same_category(self) -> None:
        backend = FakeBackend(
            json.dumps(
                {
                    "clarifications": [
                        {
                            "persona": "Privacy Steward",
                            "category": "data-and-privacy",
                            "context": "Customer records are being selected.",
                            "question": "Which customer fields are necessary?",
                            "practice": "Create a field-level data inventory.",
                        }
                    ]
                }
            )
        )
        analyzer = CopilotRAIAnalyzer(backend, protocol_documents={})
        event = {
            "schemaVersion": 1,
            "event": "transcript",
            "sequence": 1,
            "timestamp": "2026-08-11T12:00:00Z",
            "text": "We need customer records.",
        }

        first = analyzer.process(event)
        backend.response = json.dumps(
            {
                "clarifications": [
                    {
                        "persona": "Privacy Steward",
                        "category": "data-and-privacy",
                        "context": "The team is now discussing retention.",
                        "question": "When will those customer records be deleted?",
                        "practice": "Set and enforce a retention schedule.",
                    }
                ]
            }
        )
        second = analyzer.process({**event, "sequence": 2})

        self.assertEqual(len(first), 1)
        self.assertEqual(len(second), 1)
        self.assertEqual(first[0].category, second[0].category)
        self.assertNotEqual(first[0].question, second[0].question)

    def test_copilot_normalizes_harmless_response_variants(self) -> None:
        backend = FakeBackend(
            json.dumps(
                {
                    "clarifications": [
                        {
                            "persona": "Safety Evaluator",
                            "category": " EVALUATION ",
                            "context": "Deployment evidence is under discussion.",
                            "question": "What result would stop deployment",
                            "practice": "Define a release-blocking threshold.",
                        }
                    ]
                }
            )
        )
        analyzer = CopilotRAIAnalyzer(backend, protocol_documents={})

        clarifications = analyzer.process(
            {
                "schemaVersion": 1,
                "event": "transcript",
                "sequence": 1,
                "timestamp": "2026-08-11T12:00:00Z",
                "text": "We need deployment metrics.",
            }
        )

        self.assertEqual(len(clarifications), 1)
        self.assertEqual(clarifications[0].category, "evaluation")
        self.assertTrue(clarifications[0].question.endswith("?"))
        self.assertTrue(clarifications[0].impact_assessment_note)
        self.assertEqual(clarifications[0].threat_category, "Model evasion")
        self.assertEqual(clarifications[0].risk_indicator, "safety_reliability")

    def test_copilot_reports_rejected_fields_without_response_content(self) -> None:
        secret_context = "Private meeting detail"
        status_messages: list[str] = []
        backend = FakeBackend(
            json.dumps(
                {
                    "clarifications": [
                        {
                            "persona": "Safety Evaluator",
                            "category": "unsupported-category",
                            "context": secret_context,
                            "question": "What evidence is required?",
                            "practice": "Define evidence.",
                        }
                    ]
                }
            )
        )
        analyzer = CopilotRAIAnalyzer(
            backend,
            protocol_documents={},
            status=status_messages.append,
        )

        clarifications = analyzer.process(
            {
                "schemaVersion": 1,
                "event": "transcript",
                "sequence": 1,
                "timestamp": "2026-08-11T12:00:00Z",
                "text": "Discuss deployment evidence.",
            }
        )

        self.assertEqual(clarifications, [])
        self.assertTrue(
            any("Rejected fields: category=1" in message for message in status_messages)
        )
        self.assertTrue(all(secret_context not in message for message in status_messages))

    def test_copilot_empty_response_uses_local_rai_fallback(self) -> None:
        raw_text = "We will deploy the AI model using customer data."
        status_messages: list[str] = []
        analyzer = CopilotRAIAnalyzer(
            FakeBackend('{"clarifications": []}'),
            protocol_documents={},
            status=status_messages.append,
        )

        clarifications = analyzer.process(
            {
                "schemaVersion": 1,
                "event": "transcript",
                "sequence": 12,
                "timestamp": "2026-08-11T12:00:00Z",
                "text": raw_text,
            }
        )

        self.assertEqual(len(clarifications), 2)
        self.assertTrue(all(item.question for item in clarifications))
        self.assertTrue(all(item.practice for item in clarifications))
        self.assertTrue(all(item.impact_assessment_note for item in clarifications))
        self.assertTrue(all(item.threat_category for item in clarifications))
        self.assertTrue(all(item.risk_indicator for item in clarifications))
        self.assertTrue(
            any("2 local fallback suggestion(s) emitted" in message for message in status_messages)
        )
        self.assertTrue(all(raw_text not in message for message in status_messages))

    def test_live_restarts_transcript_stream_until_interrupted(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            live_transcripts_dir = Path(directory)
            (live_transcripts_dir / "package.json").write_text("{}", encoding="utf-8")
            first_process = FakeProcess([], exit_code=20)
            second_process = FakeProcess(InterruptingLines())
            args = SimpleNamespace(
                live_transcripts_dir=live_transcripts_dir,
                idle_timeout_ms=30000,
                json=False,
                check_interval_seconds=10,
            )

            with (
                patch("rai_clarifier.cli.subprocess.Popen", side_effect=[first_process, second_process]) as popen,
                patch("rai_clarifier.cli.time.sleep") as sleep,
            ):
                exit_code = _run_live(args, None, io.StringIO(), RAIClarifier())

        self.assertEqual(exit_code, 130)
        self.assertEqual(popen.call_count, 2)
        sleep.assert_called_once_with(2)
        self.assertTrue(second_process.terminated)


if __name__ == "__main__":
    unittest.main()