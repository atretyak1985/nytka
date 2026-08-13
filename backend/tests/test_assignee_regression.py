"""Assignee-quality regression against a live local LLM (SC-7).

Runs the real extraction pipeline (LM Studio at 127.0.0.1:1234) over two stored
speaker-attributed transcripts with known expected assignees and reports accuracy.
Excluded from CI/the default run — execute explicitly:

    cd backend && uv run pytest tests/test_assignee_regression.py -m manual -v -s

Record the printed accuracy in the phase Completion Report before and after any
prompt change; the share of correct assignees must never drop below the recorded
baseline.
"""
import json
from pathlib import Path

import httpx
import pytest

from app.db.models import Meeting, Project, Task, TranscriptSegment
from app.llm.extraction import extract_tasks_for_meeting

FIXTURES = sorted((Path(__file__).parent / "fixtures" / "assignee_regression").glob("*.json"))
LMSTUDIO_URL = "http://127.0.0.1:1234/v1"


def _live_model() -> str | None:
    try:
        data = httpx.get(f"{LMSTUDIO_URL}/models", timeout=2).json()
        return data["data"][0]["id"]
    except Exception:  # noqa: BLE001 - any failure means "no live LLM"
        return None


@pytest.mark.manual
@pytest.mark.parametrize("fixture_path", FIXTURES, ids=lambda p: p.stem)
def test_assignee_accuracy(db_session, fixture_path) -> None:
    model = _live_model()
    if model is None:
        pytest.skip("LM Studio is not running on 127.0.0.1:1234")

    spec = json.loads(fixture_path.read_text())
    project = db_session.get(Project, 1)
    project.team = spec["team"]
    project.llm_model = model
    project.llm_base_url = LMSTUDIO_URL

    meeting = Meeting(project_id=1, title=spec["title"], source_filename="m.mp4", media_path="/x")
    db_session.add(meeting)
    db_session.flush()
    for seg in spec["segments"]:
        db_session.add(TranscriptSegment(meeting_id=meeting.id, **seg))
    meeting.speaker_labels = spec["speaker_labels"]
    db_session.commit()

    extract_tasks_for_meeting(db_session, meeting)
    tasks = list(db_session.query(Task).filter_by(meeting_id=meeting.id))

    correct = 0
    for expected in spec["expected"]:
        needle = expected["match"].lower()
        found = [t for t in tasks if needle in t.title.lower() or needle in t.description.lower()]
        got = found[0].assignee if found else "<task not extracted>"
        ok = bool(found) and got == expected["assignee"]
        correct += ok
        print(f"{'OK ' if ok else 'MISS'} [{expected['match']}] expected={expected['assignee']!r} got={got!r}")
    accuracy = correct / len(spec["expected"])
    print(f"{fixture_path.stem}: assignee accuracy {correct}/{len(spec['expected'])} = {accuracy:.0%}")
    # Report-only: the number goes into the phase Completion Report; the hard floor
    # guards against catastrophic prompt regressions, not run-to-run LLM noise.
    assert accuracy >= 0.5
