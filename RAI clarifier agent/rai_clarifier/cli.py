from __future__ import annotations

import argparse
from collections.abc import Callable, Iterable
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from typing import Any, Protocol, TextIO

from .analyzer import Clarification, RAIClarifier
from .protocol import ProtocolRecorder, load_protocol_context


class Analyzer(Protocol):
    def process(self, event: dict[str, Any]) -> list[Clarification]: ...


def _status(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Surface responsible-AI questions and practices during a live meeting."
    )
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--live", action="store_true", help="Launch the sibling Teams transcript stream.")
    source.add_argument("--transcript-file", type=Path, help="Replay an NDJSON transcript file.")
    parser.add_argument("--project-dir", type=Path, default=Path.cwd(), help="Project containing .clarity-protocol.")
    parser.add_argument(
        "--live-transcripts-dir",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "live-transcripts",
        help="Path to the teams-live-transcript-cli project.",
    )
    parser.add_argument("--idle-timeout-ms", type=int, default=30000)
    parser.add_argument(
        "--check-interval-seconds",
        type=float,
        default=300,
        help="Analyze accumulated captions at this interval; use 0 for immediate analysis (default: 300).",
    )
    parser.add_argument("--record-protocol", action="store_true", help="Record interventions, never raw speech.")
    parser.add_argument("--json", action="store_true", help="Emit NDJSON instead of human-readable prompts.")
    parser.add_argument(
        "--output-file",
        type=Path,
        help="Also append rendered RAI responses to this file; raw transcript text is never written.",
    )
    parser.add_argument(
        "--llm",
        choices=("github",),
        help="Send caption windows and protocol context to an LLM instead of using local rules.",
    )
    parser.add_argument("--model", help="Copilot model name (default: Copilot SDK default).")
    parser.add_argument(
        "--copilot-auth-mode",
        choices=("sdk_native", "gh_cli", "token"),
        default="sdk_native",
        help="GitHub Copilot authentication mode (default: sdk_native).",
    )
    return parser


def run(argv: list[str] | None = None, *, stdin: TextIO = sys.stdin, stdout: TextIO = sys.stdout) -> int:
    args = build_parser().parse_args(argv)
    if args.check_interval_seconds < 0:
        print("error: --check-interval-seconds must be non-negative", file=sys.stderr)
        return 2
    context = load_protocol_context(args.project_dir)
    recorder = ProtocolRecorder(context) if args.record_protocol else None
    analyzer: Analyzer = RAIClarifier()
    output_file: TextIO | None = None

    if args.record_protocol and not context.protocol_dir.exists():
        print(
            f"error: {context.protocol_dir} does not exist; initialize Clarity Protocol first",
            file=sys.stderr,
        )
        return 2

    if not args.json:
        loaded = len(context.documents)
        print(f"RAI clarifier active ({loaded} Clarity Protocol documents loaded).", file=stdout)
        if context.missing_documents:
            print("Protocol context is partial; run Clarity to resolve missing project context.", file=stdout)

    if args.llm == "github":
        if not args.json:
            print(
                "GitHub Copilot mode: caption windows and protocol context are sent to GitHub.",
                file=stdout,
            )
        try:
            analyzer = _create_copilot_analyzer(args, context.documents)
        except (ImportError, RuntimeError, ValueError) as error:
            print(f"error: could not start GitHub Copilot: {error}", file=sys.stderr)
            return 2

    try:
        if args.output_file:
            args.output_file.parent.mkdir(parents=True, exist_ok=True)
            output_file = args.output_file.open("a", encoding="utf-8")
            _status(f"[Output] Appending RAI responses to {args.output_file}.")
        if args.live:
            return _run_live(args, recorder, stdout, analyzer, output_file=output_file)

        if args.transcript_file:
            with args.transcript_file.open(encoding="utf-8") as stream:
                return process_lines(
                    stream,
                    recorder=recorder,
                    json_output=args.json,
                    stdout=stdout,
                    check_interval_seconds=args.check_interval_seconds,
                    analyzer=analyzer,
                    status=_status if args.llm else None,
                    output_file=output_file,
                )
        return process_lines(
            stdin,
            recorder=recorder,
            json_output=args.json,
            stdout=stdout,
            check_interval_seconds=args.check_interval_seconds,
            analyzer=analyzer,
            status=_status if args.llm else None,
            output_file=output_file,
        )
    finally:
        if output_file is not None:
            output_file.close()
        close = getattr(analyzer, "close", None)
        if close is not None:
            close()


def _run_live(
    args: argparse.Namespace,
    recorder: ProtocolRecorder | None,
    stdout: TextIO,
    analyzer: Analyzer,
    output_file: TextIO | None = None,
) -> int:
    if not (args.live_transcripts_dir / "package.json").is_file():
        print(f"error: live-transcripts project not found at {args.live_transcripts_dir}", file=sys.stderr)
        return 2
    command = [
        "npm",
        "run",
        "--silent",
        "cli",
        "--",
        "stream",
        "--json",
        "--idle-timeout-ms",
        str(args.idle_timeout_ms),
    ]
    while True:
        if getattr(args, "llm", None):
            _status("[Transcript] Connecting to the Teams caption stream; waiting for updates...")
        process = subprocess.Popen(
            command,
            cwd=args.live_transcripts_dir,
            stdout=subprocess.PIPE,
            text=True,
            encoding="utf-8",
        )
        assert process.stdout is not None
        try:
            process_lines(
                process.stdout,
                recorder=recorder,
                json_output=args.json,
                stdout=stdout,
                check_interval_seconds=args.check_interval_seconds,
                analyzer=analyzer,
                status=_status if getattr(args, "llm", None) else None,
                output_file=output_file,
            )
            exit_code = process.wait()
        except KeyboardInterrupt:
            process.terminate()
            process.wait()
            return 130
        print(
            f"Transcript stream ended (exit {exit_code}); reconnecting in 2 seconds...",
            file=sys.stderr,
            flush=True,
        )
        time.sleep(2)


def process_lines(
    lines: Iterable[str],
    *,
    recorder: ProtocolRecorder | None,
    json_output: bool,
    stdout: TextIO,
    check_interval_seconds: float = 0,
    clock: Callable[[], float] = time.monotonic,
    analyzer: Analyzer | None = None,
    status: Callable[[str], None] | None = None,
    output_file: TextIO | None = None,
) -> int:
    clarifier = analyzer or RAIClarifier()
    pending_events: list[dict[str, object]] = []
    window_started_at = clock()

    def flush() -> None:
        nonlocal pending_events, window_started_at
        if not pending_events:
            window_started_at = clock()
            return
        latest = pending_events[-1]
        combined_event = {
            **latest,
            "event": "transcript",
            "text": "\n".join(str(event["text"]) for event in pending_events),
            "batchEventCount": len(pending_events),
        }
        for clarification in clarifier.process(combined_event):
            _render(clarification, json_output=json_output, stdout=stdout)
            if output_file is not None:
                _render(clarification, json_output=json_output, stdout=output_file)
                output_file.flush()
            if recorder is not None:
                recorder.record(clarification)
        pending_events = []
        window_started_at = clock()

    for line_number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError as error:
            print(f"warning: skipped invalid NDJSON line {line_number}: {error.msg}", file=sys.stderr)
            continue
        if not isinstance(event, dict):
            continue
        if check_interval_seconds == 0:
            pending_events = [event]
            if status and event.get("event") in {"transcript", "correction"}:
                status(f"[Transcript] Caption update received (sequence {event.get('sequence')}).")
            flush()
            continue
        if event.get("event") in {"transcript", "correction"} and isinstance(event.get("text"), str):
            pending_events.append(event)
            if status:
                status(
                    f"[Transcript] Caption update queued (sequence {event.get('sequence')}; "
                    f"batch events {len(pending_events)})."
                )
        if clock() - window_started_at >= check_interval_seconds:
            flush()
    flush()
    return 0


def _create_copilot_analyzer(args: argparse.Namespace, documents: dict[str, str]) -> Analyzer:
    from .llm_analyzer import CopilotCLIBackend, CopilotRAIAnalyzer

    token: str | None = None
    if args.copilot_auth_mode == "token":
        token = os.environ.get("GITHUB_TOKEN")
        if not token:
            raise ValueError("GITHUB_TOKEN is required for --copilot-auth-mode token")
    elif args.copilot_auth_mode == "gh_cli":
        from clarity_agent.llm.impl.github_copilot import get_gh_cli_token

        token = get_gh_cli_token(raise_on_failure=True)

    root = Path(__file__).resolve().parents[2]
    try:
        from clarity_agent.llm.impl.github_copilot import CopilotChatBackend

        backend = CopilotChatBackend(
            project_dir=args.project_dir.resolve(),
            clarity_agent_dir=root,
            token=token,
            available_tools=[],
        )
        backend.connect()
        transport = "Copilot SDK"
    except (ImportError, RuntimeError) as error:
        if isinstance(error, RuntimeError) and "SDK is not installed" not in str(error):
            raise
        backend = CopilotCLIBackend(token=token)
        transport = "Copilot CLI"
    _status(f"[Copilot] Transport ready: {transport}; tools disabled.")
    return CopilotRAIAnalyzer(
        backend,
        protocol_documents=documents,
        model=args.model,
        status=_status,
    )


def _render(clarification: Clarification, *, json_output: bool, stdout: TextIO) -> None:
    if json_output:
        print(json.dumps(clarification.as_event()), file=stdout, flush=True)
        return
    topic = clarification.category.replace("-", " ").title()
    print(f"\n{clarification.persona} | {topic}", file=stdout)
    print("-" * min(72, len(clarification.persona) + len(topic) + 3), file=stdout)
    if clarification.context:
        print(f"Why this matters: {clarification.context}", file=stdout)
    print(f"Threat category: {clarification.threat_category or 'Not identified'}", file=stdout)
    print(f"Risk indicator: {clarification.risk_indicator}", file=stdout)
    print(f"Question: {clarification.question}", file=stdout)
    print(f"Suggested action: {clarification.practice}", file=stdout)
    print(f"Impact assessment note: {clarification.impact_assessment_note}", file=stdout, flush=True)