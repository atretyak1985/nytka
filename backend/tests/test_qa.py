"""Project-memory Q&A: grounding, citation validation and the honest no-data path."""
from unittest.mock import MagicMock, patch

import pytest

from app.db.models import Meeting, Project, TranscriptSegment
from app.llm.qa import answer_question
from app.llm.schemas import AskCitation, AskResult


def _meeting_with_line(db, text: str, title: str = "Auth review") -> Meeting:
    meeting = Meeting(project_id=1, title=title, source_filename="m.mp4", media_path="/x")
    db.add(meeting)
    db.flush()
    db.add(TranscriptSegment(meeting_id=meeting.id, t_start=90.0, t_end=95.0, text=text))
    db.commit()
    return meeting


def test_answer_keeps_valid_citations_and_drops_invented_ones(db_session) -> None:
    project = db_session.get(Project, 1)
    meeting = _meeting_with_line(db_session, "ми вирішили використовувати OAuth для авторизації")
    client = MagicMock()
    client.chat.completions.create.return_value = AskResult(
        answer="Команда вирішила використовувати OAuth.",
        no_data=False,
        citations=[
            AskCitation(meeting_id=meeting.id, t_start=90.0, quote="вирішили використовувати OAuth"),
            AskCitation(meeting_id=999, t_start=12.0, quote="вигадана цитата"),
        ],
    )
    with patch("app.llm.qa.get_client", return_value=client):
        result = answer_question(db_session, project, "Що ми вирішили про авторизацію?")

    assert result["no_data"] is False
    assert len(result["citations"]) == 1
    citation = result["citations"][0]
    assert citation["meeting_id"] == meeting.id
    assert citation["meeting_title"] == "Auth review"
    assert citation["t_start"] == 90.0


def test_excerpts_carry_meeting_id_and_timestamp_header(db_session) -> None:
    project = db_session.get(Project, 1)
    meeting = _meeting_with_line(db_session, "обговорили авторизацію докладно")
    client = MagicMock()
    client.chat.completions.create.return_value = AskResult(
        answer="ok", no_data=False,
        citations=[AskCitation(meeting_id=meeting.id, t_start=90.0, quote="обговорили")],
    )
    with patch("app.llm.qa.get_client", return_value=client):
        answer_question(db_session, project, "авторизацію")

    messages = client.chat.completions.create.call_args.kwargs["messages"]
    assert [m["role"] for m in messages] == ["system", "user"]  # one leading system message
    assert f"[meeting {meeting.id} «Auth review» @ 01:30" in messages[1]["content"]


def test_all_citations_invalid_forces_no_data(db_session) -> None:
    project = db_session.get(Project, 1)
    _meeting_with_line(db_session, "щось про авторизацію")
    client = MagicMock()
    client.chat.completions.create.return_value = AskResult(
        answer="Ми вирішили купити ліцензію Okta.",
        no_data=False,
        citations=[AskCitation(meeting_id=4242, t_start=1.0, quote="вигадка")],
    )
    with patch("app.llm.qa.get_client", return_value=client):
        result = answer_question(db_session, project, "авторизацію")

    assert result["no_data"] is True  # unproven answer is never presented as grounded
    assert result["citations"] == []
    assert result["answer"] == "Ми вирішили купити ліцензію Okta."  # text kept, not rewritten


def test_answer_without_citations_forces_no_data(db_session) -> None:
    project = db_session.get(Project, 1)
    _meeting_with_line(db_session, "щось про авторизацію")
    client = MagicMock()
    client.chat.completions.create.return_value = AskResult(
        answer="Так, ми це вирішили.", no_data=False, citations=[]
    )
    with patch("app.llm.qa.get_client", return_value=client):
        result = answer_question(db_session, project, "авторизацію")
    assert result["no_data"] is True


def test_empty_index_never_calls_the_llm(db_session) -> None:
    project = db_session.get(Project, 1)
    with patch("app.llm.qa.get_client") as mock_client:
        result = answer_question(db_session, project, "що ми вирішили про авторизацію?")
    mock_client.assert_not_called()
    assert result["no_data"] is True
    assert result["citations"] == []
    assert "No relevant meetings" in result["answer"]


def test_tasks_are_not_used_as_evidence(db_session) -> None:
    """A task is derived text: it must never become a quotable source."""
    from app.db.models import Task

    project = db_session.get(Project, 1)
    meeting = Meeting(project_id=1, title="M", source_filename="m.mp4", media_path="/x")
    db_session.add(meeting)
    db_session.flush()
    db_session.add(Task(project_id=1, meeting_id=meeting.id, title="Полагодити авторизацію", description=""))
    db_session.commit()

    with patch("app.llm.qa.get_client") as mock_client:
        result = answer_question(db_session, project, "авторизацію")
    mock_client.assert_not_called()  # only the task matched — nothing citable was retrieved
    assert result["no_data"] is True


def test_llm_error_propagates(db_session) -> None:
    project = db_session.get(Project, 1)
    _meeting_with_line(db_session, "щось про авторизацію")
    client = MagicMock()
    client.chat.completions.create.side_effect = RuntimeError("boom")
    # The route (api/memory.py) turns this into a 502 — qa.py must not swallow it.
    with patch("app.llm.qa.get_client", return_value=client), pytest.raises(RuntimeError, match="boom"):
        answer_question(db_session, project, "авторизацію")


def test_other_project_meetings_never_enter_the_context(db_session) -> None:
    project = db_session.get(Project, 1)
    other = Project(name="Other")
    db_session.add(other)
    db_session.commit()
    foreign = Meeting(project_id=other.id, title="Foreign", source_filename="m.mp4", media_path="/x")
    db_session.add(foreign)
    db_session.flush()
    db_session.add(TranscriptSegment(meeting_id=foreign.id, t_start=0.0, t_end=1.0, text="секрет про авторизацію"))
    db_session.commit()

    with patch("app.llm.qa.get_client") as mock_client:
        result = answer_question(db_session, project, "авторизацію")
    mock_client.assert_not_called()
    assert result["no_data"] is True
