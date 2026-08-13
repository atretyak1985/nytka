import io
from unittest.mock import MagicMock, patch

from app.db.models import BriefStatus, Meeting, MeetingBrief, Task, TranscriptSegment


def _upload(client) -> int:
    with patch("app.api.meetings.run_pipeline"):
        resp = client.post(
            "/api/meetings",
            files={"file": ("demo.mp4", io.BytesIO(b"fake"), "video/mp4")},
            data={"title": "Demo"},
        )
    return resp.json()["id"]


def _add_brief(db, meeting_id: int, **overrides) -> MeetingBrief:
    fields = dict(
        meeting_id=meeting_id,
        summary="Agreed on the plan.",
        decisions=[{"text": "Ship it.", "source_timestamp": 30.0}],
        risks=[],
        open_questions=[],
        next_steps=[],
        status=BriefStatus.READY,
    )
    fields.update(overrides)
    brief = MeetingBrief(**fields)
    db.add(brief)
    db.commit()
    return brief


def test_get_brief_404_unknown_meeting(client) -> None:
    assert client.get("/api/meetings/999/brief").status_code == 404


def test_get_brief_404_when_absent(client) -> None:
    mid = _upload(client)
    assert client.get(f"/api/meetings/{mid}/brief").status_code == 404


def test_get_brief_returns_points(client, db_session) -> None:
    mid = _upload(client)
    _add_brief(db_session, mid)
    body = client.get(f"/api/meetings/{mid}/brief").json()
    assert body["status"] == "ready"
    assert body["summary"] == "Agreed on the plan."
    assert body["decisions"] == [{"text": "Ship it.", "source_timestamp": 30.0}]
    assert body["risks"] == []


def test_meeting_detail_embeds_brief(client, db_session) -> None:
    mid = _upload(client)
    detail = client.get(f"/api/meetings/{mid}").json()
    assert detail["brief"] is None
    _add_brief(db_session, mid)
    detail = client.get(f"/api/meetings/{mid}").json()
    assert detail["brief"]["summary"] == "Agreed on the plan."


def test_regenerate_404_unknown_meeting(client) -> None:
    assert client.post("/api/meetings/999/brief/regenerate").status_code == 404


def test_regenerate_409_without_transcript(client) -> None:
    mid = _upload(client)
    assert client.post(f"/api/meetings/{mid}/brief/regenerate").status_code == 409


def test_regenerate_queues_background_job(client, db_session) -> None:
    mid = _upload(client)
    db_session.add(TranscriptSegment(meeting_id=mid, t_start=0, t_end=1, text="hi"))
    db_session.commit()
    with patch("app.api.meetings.regenerate_brief") as mock_regen:
        resp = client.post(f"/api/meetings/{mid}/brief/regenerate")
    assert resp.status_code == 200
    assert resp.json()["status"] == "processing"
    mock_regen.assert_called_once_with(mid)
    assert db_session.query(MeetingBrief).filter_by(meeting_id=mid).count() == 1


def test_regenerate_resets_existing_error_brief(client, db_session) -> None:
    mid = _upload(client)
    db_session.add(TranscriptSegment(meeting_id=mid, t_start=0, t_end=1, text="hi"))
    _add_brief(db_session, mid, status=BriefStatus.ERROR, error="boom")
    with patch("app.api.meetings.regenerate_brief"):
        body = client.post(f"/api/meetings/{mid}/brief/regenerate").json()
    assert body["status"] == "processing"
    assert body["error"] is None
    assert db_session.query(MeetingBrief).filter_by(meeting_id=mid).count() == 1  # reused, not duplicated


def test_regeneration_leaves_segments_and_tasks_untouched(db_session) -> None:
    """SC-4: regenerating the brief must not touch transcript_segments or tasks."""
    from app.llm.brief import generate_brief_for_meeting
    from app.llm.schemas import BriefPoint, BriefResult

    meeting = Meeting(project_id=1, title="m", source_filename="m.mp4", media_path="/x")
    db_session.add(meeting)
    db_session.flush()
    db_session.add(TranscriptSegment(meeting_id=meeting.id, t_start=0, t_end=1, text="hi"))
    db_session.add(Task(project_id=1, meeting_id=meeting.id, title="keep me"))
    db_session.commit()
    segments_before = db_session.query(TranscriptSegment).filter_by(meeting_id=meeting.id).count()
    tasks_before = db_session.query(Task).filter_by(meeting_id=meeting.id).count()

    fake = BriefResult(summary="s", decisions=[BriefPoint(text="d")], risks=[], open_questions=[], next_steps=[])
    llm = MagicMock()
    llm.chat.completions.create.return_value = fake
    with patch("app.llm.brief.get_client", return_value=llm):
        generate_brief_for_meeting(db_session, meeting)
        generate_brief_for_meeting(db_session, meeting)  # regenerate over READY

    assert db_session.query(TranscriptSegment).filter_by(meeting_id=meeting.id).count() == segments_before
    assert db_session.query(Task).filter_by(meeting_id=meeting.id).count() == tasks_before


def test_brief_markdown_endpoint(client, db_session) -> None:
    mid = _upload(client)
    _add_brief(db_session, mid)
    resp = client.get(f"/api/meetings/{mid}/brief/markdown")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/markdown")
    assert "# Demo — Meeting brief" in resp.text
    assert "- [00:30] Ship it." in resp.text


def test_brief_markdown_404_when_absent(client) -> None:
    mid = _upload(client)
    assert client.get(f"/api/meetings/{mid}/brief/markdown").status_code == 404
