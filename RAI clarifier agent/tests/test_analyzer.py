import unittest

from rai_clarifier import RAIClarifier


class RAIClarifierTests(unittest.TestCase):
    def test_emits_question_and_practice_for_real_transcript_event(self) -> None:
        clarifier = RAIClarifier()

        results = clarifier.process(
            {
                "schemaVersion": 1,
                "event": "transcript",
                "sequence": 4,
                "timestamp": "2026-08-11T12:00:00Z",
                "source": "dom",
                "speaker": "Alex",
                "text": "We will use customer data to rank candidates automatically.",
            }
        )

        self.assertGreaterEqual(len(results), 2)
        self.assertTrue(all(result.question.endswith("?") for result in results))
        self.assertTrue(all(result.practice for result in results))
        self.assertTrue(all(result.impact_assessment_note for result in results))
        self.assertTrue(all(result.threat_category for result in results))
        self.assertTrue(all(result.risk_indicator for result in results))

    def test_ignores_partials_and_deduplicates_corrections(self) -> None:
        clarifier = RAIClarifier()
        partial = {
            "schemaVersion": 1,
            "event": "partial",
            "sequence": 1,
            "timestamp": "2026-08-11T12:00:00Z",
            "source": "dom",
            "text": "customer data",
        }
        transcript = {**partial, "event": "transcript", "sequence": 2}
        correction = {**transcript, "event": "correction", "sequence": 3}

        self.assertEqual(clarifier.process(partial), [])
        self.assertTrue(clarifier.process(transcript))
        self.assertEqual(clarifier.process(correction), [])

    def test_ignores_status_and_unknown_schema(self) -> None:
        clarifier = RAIClarifier()

        self.assertEqual(
            clarifier.process(
                {
                    "schemaVersion": 1,
                    "event": "status",
                    "sequence": 1,
                    "timestamp": "2026-08-11T12:00:00Z",
                    "source": "dom",
                    "reason": "connected",
                }
            ),
            [],
        )
        self.assertEqual(
            clarifier.process(
                {
                    "schemaVersion": 2,
                    "event": "transcript",
                    "sequence": 2,
                    "timestamp": "2026-08-11T12:00:01Z",
                    "source": "dom",
                    "text": "customer data",
                }
            ),
            [],
        )


if __name__ == "__main__":
    unittest.main()