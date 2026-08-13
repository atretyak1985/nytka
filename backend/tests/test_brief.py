from unittest.mock import MagicMock, patch

from app.db.models import BriefStatus, Meeting, MeetingBrief, Project, TranscriptSegment
from app.llm.brief import generate_brief_for_meeting, render_brief_markdown
from app.llm.schemas import BriefPoint, BriefResult


def _brief_result(suffix: str = "") -> BriefResult:
    return BriefResult(
        summary=f"The team reviewed the demo{suffix}.",
        decisions=[BriefPoint(text=f"Ship the login form{suffix}.", source_timestamp=12.0)],
        risks=[BriefPoint(text=f"The API is unstable{suffix}.", source_timestamp=80.0)],
        open_questions=[BriefPoint(text=f"Who owns QA{suffix}?", source_timestamp=None)],
        next_steps=[BriefPoint(text=f"Schedule a follow-up{suffix}.", source_timestamp=200.0)],
    )


def _meeting_with_segments(db, texts: list[str]) -> Meeting:
    meeting = Meeting(project_id=1, title="Demo review", source_filename="m.mp4", media_path="/x")
    db.add(meeting)
    db.flush()
    for i, text in enumerate(texts):
        db.add(TranscriptSegment(meeting_id=meeting.id, t_start=float(i * 10), t_end=float(i * 10 + 5), text=text))
    db.commit()
    return meeting


def test_brief_map_reduce_two_chunks(db_session) -> None:
    # Two segments of ~6000 chars each force build_chunks (max 8000) into 2 chunks.
    meeting = _meeting_with_segments(db_session, ["обговорення " * 500, "рішення " * 700])
    client = MagicMock()
    client.chat.completions.create.side_effect = [
        _brief_result(" part one"),
        _brief_result(" part two"),
        _brief_result(" merged"),
    ]
    with patch("app.llm.brief.get_client", return_value=client):
        brief = generate_brief_for_meeting(db_session, meeting)

    assert client.chat.completions.create.call_count == 3  # 2 maps + 1 reduce
    assert brief.status == BriefStatus.READY
    assert brief.summary == "The team reviewed the demo merged."
    assert brief.decisions == [{"text": "Ship the login form merged.", "source_timestamp": 12.0}]
    assert brief.risks[0]["source_timestamp"] == 80.0
    assert brief.open_questions[0]["source_timestamp"] is None
    assert brief.next_steps[0]["text"] == "Schedule a follow-up merged."
    assert brief.generated_at is not None
    # The reduce prompt carries both partials.
    reduce_prompt = client.chat.completions.create.call_args.kwargs["messages"][-1]["content"]
    assert "part one" in reduce_prompt and "part two" in reduce_prompt


def test_brief_single_chunk_skips_reduce(db_session) -> None:
    meeting = _meeting_with_segments(db_session, ["коротка зустріч"])
    client = MagicMock()
    client.chat.completions.create.return_value = _brief_result()
    with patch("app.llm.brief.get_client", return_value=client):
        brief = generate_brief_for_meeting(db_session, meeting)
    assert client.chat.completions.create.call_count == 1  # map result IS the final brief
    assert brief.status == BriefStatus.READY
    assert brief.summary == "The team reviewed the demo."


def test_brief_sends_single_leading_system_message(db_session) -> None:
    project = db_session.get(Project, 1)
    project.ai_context = "CRM for florists."
    db_session.commit()
    meeting = _meeting_with_segments(db_session, ["текст"])
    client = MagicMock()
    client.chat.completions.create.return_value = _brief_result()
    with patch("app.llm.brief.get_client", return_value=client):
        generate_brief_for_meeting(db_session, meeting)
    messages = client.chat.completions.create.call_args.kwargs["messages"]
    assert [m["role"] for m in messages] == ["system", "user"]
    assert "CRM for florists." in messages[0]["content"]


def test_brief_llm_error_sets_error_status_and_redacts_key(db_session) -> None:
    project = db_session.get(Project, 1)
    project.llm_api_key = "sk-super-secret"
    db_session.commit()
    meeting = _meeting_with_segments(db_session, ["текст"])
    client = MagicMock()
    client.chat.completions.create.side_effect = RuntimeError("auth failed for key sk-super-secret")
    with patch("app.llm.brief.get_client", return_value=client):
        brief = generate_brief_for_meeting(db_session, meeting)  # must NOT raise
    assert brief.status == BriefStatus.ERROR
    assert "sk-super-secret" not in brief.error
    assert "[REDACTED]" in brief.error


def test_brief_empty_transcript_yields_empty_ready_brief(db_session) -> None:
    meeting = _meeting_with_segments(db_session, [])
    with patch("app.llm.brief.get_client") as mock_client:
        brief = generate_brief_for_meeting(db_session, meeting)
    mock_client.assert_not_called()  # nothing to summarize — no LLM round-trip
    assert brief.status == BriefStatus.READY
    assert brief.summary == ""
    assert brief.decisions == []


def test_brief_regeneration_reuses_row(db_session) -> None:
    meeting = _meeting_with_segments(db_session, ["текст"])
    client = MagicMock()
    client.chat.completions.create.return_value = _brief_result()
    with patch("app.llm.brief.get_client", return_value=client):
        first = generate_brief_for_meeting(db_session, meeting)
        second = generate_brief_for_meeting(db_session, meeting)
    assert first.id == second.id  # one brief per meeting, updated in place
    assert db_session.query(MeetingBrief).filter_by(meeting_id=meeting.id).count() == 1


def _brief_row(**overrides) -> MeetingBrief:
    fields = dict(
        meeting_id=1,
        summary="Team agreed on the release plan.",
        decisions=[{"text": "Release on Friday.", "source_timestamp": 65.0}],
        risks=[],
        open_questions=[{"text": "Budget unclear.", "source_timestamp": None}],
        next_steps=[],
        status=BriefStatus.READY,
    )
    fields.update(overrides)
    return MeetingBrief(**fields)


def test_render_brief_markdown_stable_output() -> None:
    meeting = Meeting(project_id=1, title="Sprint sync", source_filename="m.mp4", media_path="/x")
    md = render_brief_markdown(meeting, _brief_row())
    assert md == (
        "# Sprint sync — Meeting brief\n"
        "\n"
        "Team agreed on the release plan.\n"
        "\n"
        "## Decisions\n"
        "- [01:05] Release on Friday.\n"
        "\n"
        "## Open questions\n"
        "- Budget unclear.\n"
    )


def test_render_brief_markdown_skips_empty_sections() -> None:
    meeting = Meeting(project_id=1, title="m", source_filename="m.mp4", media_path="/x")
    md = render_brief_markdown(meeting, _brief_row(decisions=[], open_questions=[], summary=""))
    assert "## Decisions" not in md
    assert "## Open questions" not in md
    assert "## Risks" not in md
    assert md.startswith("# m — Meeting brief")
