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


def test_extraction_empty_transcript_returns_zero(db_session) -> None:
    meeting = Meeting(project_id=1, title="m", source_filename="m.mp4", media_path="/x")
    db_session.add(meeting)
    db_session.commit()
    count = extract_tasks_for_meeting(db_session, meeting)
    assert count == 0
