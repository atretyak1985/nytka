"""Project-memory API: /search and /ask."""
from unittest.mock import MagicMock, patch

from app.db.models import BriefStatus, Meeting, MeetingBrief, Task, TranscriptSegment
from app.db.fts import index_brief
from app.llm.schemas import AskCitation, AskResult


def _seed(db) -> Meeting:
    meeting = Meeting(project_id=1, title="Demo review", source_filename="m.mp4", media_path="/x")
    db.add(meeting)
    db.flush()
    db.add(TranscriptSegment(meeting_id=meeting.id, t_start=65.0, t_end=70.0, text="ми обговорили деплой у пʼятницю"))
    db.add(Task(project_id=1, meeting_id=meeting.id, title="Підготувати деплой", description="перед демо", source_timestamp=65.0))
    brief = MeetingBrief(
        meeting_id=meeting.id,
        summary="Команда домовилась про деплой.",
        decisions=[{"text": "Деплой у пʼятницю.", "source_timestamp": 65.0}],
        risks=[], open_questions=[], next_steps=[],
        status=BriefStatus.READY,
    )
    db.add(brief)
    db.commit()
    index_brief(db, brief)
    db.commit()
    return meeting


def test_search_returns_all_three_kinds_with_meeting_title(client, db_session) -> None:
    meeting = _seed(db_session)
    body = client.get("/api/projects/1/search", params={"q": "деплой"}).json()

    assert body["query"] == "деплой"
    kinds = {h["kind"] for h in body["hits"]}
    assert kinds == {"segment", "task", "brief"}
    assert all(h["meeting_title"] == "Demo review" for h in body["hits"])
    assert all(h["meeting_id"] == meeting.id for h in body["hits"])
    segment_hit = next(h for h in body["hits"] if h["kind"] == "segment")
    assert segment_hit["t_start"] == 65.0
    assert "\x01" in segment_hit["snippet"] and "\x02" in segment_hit["snippet"]  # markers, not <mark>
    task_hit = next(h for h in body["hits"] if h["kind"] == "task")
    assert task_hit["task_id"] is not None
    assert next(h for h in body["hits"] if h["kind"] == "brief")["task_id"] is None


def test_search_does_not_leak_other_projects(client, db_session) -> None:
    from app.db.models import Project

    _seed(db_session)
    other = Project(name="Other")
    db_session.add(other)
    db_session.commit()
    res = client.get(f"/api/projects/{other.id}/search", params={"q": "деплой"})
    assert res.status_code == 200
    assert res.json()["hits"] == []


def test_search_blank_query_is_empty_not_422(client, db_session) -> None:
    _seed(db_session)
    for q in ("", "   ", "?!.,"):
        res = client.get("/api/projects/1/search", params={"q": q})
        assert res.status_code == 200, q
        assert res.json()["hits"] == []


def test_search_operator_input_does_not_500(client, db_session) -> None:
    _seed(db_session)
    for q in ('OR', '"', '*', 'деплой OR (NEAR "x" *)', 'a AND NOT b'):
        assert client.get("/api/projects/1/search", params={"q": q}).status_code == 200, q


def test_search_unknown_project_404(client) -> None:
    assert client.get("/api/projects/999/search", params={"q": "деплой"}).status_code == 404


def test_ask_returns_answer_with_citations(client, db_session) -> None:
    meeting = _seed(db_session)
    llm = MagicMock()
    llm.chat.completions.create.return_value = AskResult(
        answer="Деплой заплановано на пʼятницю.",
        no_data=False,
        citations=[AskCitation(meeting_id=meeting.id, t_start=65.0, quote="деплой у пʼятницю")],
    )
    with patch("app.llm.qa.get_client", return_value=llm):
        body = client.post("/api/projects/1/ask", json={"question": "коли деплой?"}).json()

    assert body["no_data"] is False
    assert body["citations"] == [
        {
            "meeting_id": meeting.id,
            "meeting_title": "Demo review",
            "t_start": 65.0,
            "quote": "деплой у пʼятницю",
        }
    ]


def test_ask_without_relevant_data_says_so(client, db_session) -> None:
    _seed(db_session)
    with patch("app.llm.qa.get_client") as mock_client:
        body = client.post("/api/projects/1/ask", json={"question": "бюджет проєкту"}).json()
    mock_client.assert_not_called()
    assert body["no_data"] is True
    assert body["citations"] == []


def test_ask_unknown_project_404(client) -> None:
    assert client.post("/api/projects/999/ask", json={"question": "x"}).status_code == 404


def test_ask_empty_question_422(client, db_session) -> None:
    _seed(db_session)
    assert client.post("/api/projects/1/ask", json={"question": "   "}).status_code == 422


def test_ask_llm_error_502_without_api_key(client, db_session) -> None:
    from app.db.models import Project

    project = db_session.get(Project, 1)
    project.llm_api_key = "sk-super-secret"
    db_session.commit()
    _seed(db_session)
    llm = MagicMock()
    llm.chat.completions.create.side_effect = RuntimeError("auth failed for key sk-super-secret")
    with patch("app.llm.qa.get_client", return_value=llm):
        res = client.post("/api/projects/1/ask", json={"question": "коли деплой?"})

    assert res.status_code == 502
    assert "sk-super-secret" not in res.text
    assert "[REDACTED]" in res.text
