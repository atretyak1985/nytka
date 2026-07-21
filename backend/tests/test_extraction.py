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


def test_extraction_sends_single_leading_system_message(db_session) -> None:
    # Local-model chat templates (LM Studio/Ollama) raise "System message must be
    # at the beginning" when a second system message appears mid-conversation, so
    # the base prompt and project context must be merged into one leading message.
    from app.db.models import Project

    project = db_session.get(Project, 1)
    project.ai_context = "CRM for florists."
    db_session.commit()

    meeting = _meeting_with_transcript(db_session)
    client = MagicMock()
    client.chat.completions.create.return_value = ExtractionResult(tasks=[])
    with patch("app.llm.extraction.get_client", return_value=client):
        extract_tasks_for_meeting(db_session, meeting)

    messages = client.chat.completions.create.call_args.kwargs["messages"]
    assert [m["role"] for m in messages] == ["system", "user"]
    assert "CRM for florists." in messages[0]["content"]


def test_context_block_is_framed_as_non_gating_background() -> None:
    from app.llm.prompts import project_context_block

    block = project_context_block("Skygor drone platform.", [], [], "")
    # The distilled/raw context must be scoped as reference-only background that
    # cannot make the model withhold extraction (the empty-list failure mode).
    assert "BACKGROUND" in block
    assert "never withhold" in block.lower()


def test_extraction_prefers_knowledge_brief_over_ai_context(db_session) -> None:
    from app.db.models import Project

    project = db_session.get(Project, 1)
    project.ai_context = "RAW SOURCE NOTES that should not be injected"
    project.knowledge_brief = "DISTILLED BRIEF for injection"
    db_session.commit()

    meeting = _meeting_with_transcript(db_session)
    client = MagicMock()
    client.chat.completions.create.return_value = ExtractionResult(tasks=[])
    with patch("app.llm.extraction.get_client", return_value=client):
        extract_tasks_for_meeting(db_session, meeting)

    system_texts = " ".join(
        m["content"] for m in client.chat.completions.create.call_args.kwargs["messages"]
        if m["role"] == "system"
    )
    assert "DISTILLED BRIEF for injection" in system_texts
    assert "RAW SOURCE NOTES" not in system_texts


def test_extraction_keeps_only_area_from_taxonomy(db_session) -> None:
    from app.db.models import Project

    project = db_session.get(Project, 1)
    project.task_areas = ["[In-mission][Flight Control]", "[Global]"]
    db_session.commit()

    meeting = _meeting_with_transcript(db_session)
    fake = ExtractionResult(tasks=[
        ActionItem(title="valid area task", area="[Global]"),
        ActionItem(title="invalid area task", area="[Made Up][Nope]"),
    ])
    client = MagicMock()
    client.chat.completions.create.return_value = fake
    with patch("app.llm.extraction.get_client", return_value=client):
        extract_tasks_for_meeting(db_session, meeting)

    tasks = {t.title: t.area for t in db_session.query(Task).filter_by(meeting_id=meeting.id)}
    assert tasks["valid area task"] == "[Global]"
    assert tasks["invalid area task"] == ""  # invented area dropped


def test_context_block_language_directive_present_for_fixed_language() -> None:
    from app.llm.prompts import project_context_block

    block = project_context_block("", [], [], "", task_language="uk")
    assert "Ukrainian" in block
    assert "title and description" in block


def test_context_block_language_auto_adds_nothing() -> None:
    from app.llm.prompts import project_context_block

    assert project_context_block("", [], [], "", task_language="auto") == ""


def test_context_block_language_unknown_code_passes_through() -> None:
    from app.llm.prompts import project_context_block

    block = project_context_block("", [], [], "", task_language="Spanish")
    assert "Spanish" in block


def test_match_team_member_exact_and_cyrillic_first_name() -> None:
    from app.llm.extraction import _match_team_member

    team = [
        {"name": "Victor Udintsov", "role": "designer"},
        {"name": "Nazar Salo", "role": "dev"},
        {"name": "Andrii Tretiak", "role": "dev"},
    ]
    assert _match_team_member("Victor Udintsov", team) == "Victor Udintsov"
    assert _match_team_member("Віктор", team) == "Victor Udintsov"
    assert _match_team_member("Назар", team) == "Nazar Salo"
    assert _match_team_member("Андрій", team) == "Andrii Tretiak"
    assert _match_team_member("nazar salo", team) == "Nazar Salo"


def test_match_team_member_ambiguous_or_unknown_returns_none() -> None:
    from app.llm.extraction import _match_team_member

    team = [{"name": "Andrii Tretiak", "role": ""}, {"name": "Andrii Shevchenko", "role": ""}]
    assert _match_team_member("Андрій", team) is None  # two Andriis — never guess
    assert _match_team_member("Оленка", team) is None  # not on the team
    assert _match_team_member(None, team) is None
    assert _match_team_member("  ", team) is None
    assert _match_team_member("Андрій", []) is None


def test_team_prompt_instructs_contextual_assignment() -> None:
    from app.llm.prompts import project_context_block

    block = project_context_block("", [], [{"name": "Victor Udintsov", "role": "designer"}], "")
    assert "Victor Udintsov" in block
    assert "null ONLY" in block
    assert "Never assign a person who is not on the list" in block
