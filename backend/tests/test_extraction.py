import pytest
from unittest.mock import MagicMock, patch

from app.db.models import Meeting, Task, TaskStatus, TranscriptSegment
from app.llm.extraction import extract_tasks_for_meeting
from app.llm.schemas import ActionItem, ExtractionResult


def _meeting_with_transcript(db) -> Meeting:
    meeting = Meeting(project_id=1, title="m", source_filename="m.mp4", media_path="/x")
    db.add(meeting)
    db.flush()
    db.add(TranscriptSegment(meeting_id=meeting.id, t_start=0, t_end=5, text="Іван зробить логін-форму"))
    db.commit()
    return meeting


def test_extraction_creates_draft_tasks(db_session) -> None:
    meeting = _meeting_with_transcript(db_session)
    fake = ExtractionResult(tasks=[
        ActionItem(title="Зробити логін-форму", assignee="Іван", source_timestamp=2.0),
        ActionItem(title="зробити логін-форму", assignee="Іван"),  # duplicate, different case
    ])
    client = MagicMock()
    client.chat.completions.create.return_value = fake
    with patch("app.llm.extraction.get_client", return_value=client):
        count = extract_tasks_for_meeting(db_session, meeting)
    assert count == 1
    task = db_session.query(Task).filter_by(meeting_id=meeting.id).one()
    assert task.status == TaskStatus.DRAFT
    assert task.assignee == "Іван"
    assert task.source_timestamp == 2.0


def test_extraction_invalid_priority_falls_back(db_session) -> None:
    meeting = _meeting_with_transcript(db_session)
    fake = ExtractionResult(tasks=[ActionItem(title="X", priority="urgent!!")])
    client = MagicMock()
    client.chat.completions.create.return_value = fake
    with patch("app.llm.extraction.get_client", return_value=client):
        extract_tasks_for_meeting(db_session, meeting)
    task = db_session.query(Task).filter_by(meeting_id=meeting.id).one()
    assert task.priority.value == "medium"


def test_extraction_updates_progress_per_chunk(db_session) -> None:
    meeting = _meeting_with_transcript(db_session)
    fake = ExtractionResult(tasks=[ActionItem(title="X")])
    client = MagicMock()
    client.chat.completions.create.return_value = fake
    with patch("app.llm.extraction.get_client", return_value=client):
        extract_tasks_for_meeting(db_session, meeting)
    db_session.refresh(meeting)
    assert meeting.progress == 1.0  # single chunk → full progress after extraction


def test_extraction_empty_transcript_returns_zero(db_session) -> None:
    meeting = Meeting(project_id=1, title="m", source_filename="m.mp4", media_path="/x")
    db_session.add(meeting)
    db_session.commit()
    count = extract_tasks_for_meeting(db_session, meeting)
    assert count == 0


def test_extraction_partial_failure_reraises_without_commit(db_session) -> None:
    meeting = _meeting_with_transcript(db_session)
    client = MagicMock()
    client.chat.completions.create.side_effect = RuntimeError("LLM timeout")
    with patch("app.llm.extraction.get_client", return_value=client):
        with pytest.raises(RuntimeError):
            extract_tasks_for_meeting(db_session, meeting)
    assert db_session.query(Task).filter_by(meeting_id=meeting.id).count() == 0


def test_project_context_block_builds_and_skips() -> None:
    from app.llm.prompts import project_context_block

    assert project_context_block("", [], [], "") == ""
    block = project_context_block(
        "CRM for florists.",
        ["Bloombum", "Stripe"],
        [{"name": "Olena", "role": "PM"}, {"name": "", "role": "x"}],
        "As a <role>, I want <action>.",
    )
    assert "CRM for florists." in block
    assert "Bloombum" in block and "Stripe" in block
    assert "Olena (PM)" in block
    assert "As a <role>" in block


def test_extraction_injects_project_context(db_session) -> None:
    from app.db.models import Project

    project = db_session.get(Project, 1)
    project.ai_context = "CRM for florists."
    project.glossary = ["Bloombum"]
    project.team = [{"name": "Olena", "role": "PM"}]
    db_session.commit()

    meeting = _meeting_with_transcript(db_session)
    client = MagicMock()
    client.chat.completions.create.return_value = ExtractionResult(tasks=[])
    with patch("app.llm.extraction.get_client", return_value=client):
        extract_tasks_for_meeting(db_session, meeting)

    messages = client.chat.completions.create.call_args.kwargs["messages"]
    system_texts = [m["content"] for m in messages if m["role"] == "system"]
    assert any("CRM for florists." in t for t in system_texts)
    assert any("Bloombum" in t for t in system_texts)
    assert any("Olena" in t for t in system_texts)
