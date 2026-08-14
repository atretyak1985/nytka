"""Cross-meeting duplicate flagging: candidate selection, verdict validation,
idempotency and the never-raises contract."""
from unittest.mock import MagicMock, patch

from app.db.models import Meeting, Task, TaskStatus
from app.llm.dedup import _candidate_tasks, flag_duplicates_for_meeting
from app.llm.schemas import DuplicateVerdict


def _meeting(db, title: str) -> Meeting:
    meeting = Meeting(project_id=1, title=title, source_filename="m.mp4", media_path="/x")
    db.add(meeting)
    db.commit()
    return meeting


def _task(db, meeting: Meeting | None, title: str, description: str = "", **kw) -> Task:
    task = Task(
        project_id=1,
        meeting_id=meeting.id if meeting else None,
        title=title,
        description=description,
        **kw,
    )
    db.add(task)
    db.commit()
    return task


def _verdict_client(*verdicts) -> MagicMock:
    client = MagicMock()
    client.chat.completions.create.side_effect = list(verdicts)
    return client


def test_flags_draft_that_repeats_a_task_from_another_meeting(db_session) -> None:
    old = _meeting(db_session, "Sprint 1")
    existing = _task(
        db_session, old, "Fix login timeout", "session expires after 5 minutes",
        status=TaskStatus.APPROVED, jira_issue_key="CRM-42",
    )
    new = _meeting(db_session, "Sprint 2")
    draft = _task(db_session, new, "Fix login timeout", "session expires too fast")

    client = _verdict_client(DuplicateVerdict(duplicate_of=1, reason="Той самий дефект логіну."))
    with patch("app.llm.dedup.get_client", return_value=client):
        flagged = flag_duplicates_for_meeting(db_session, new)

    assert flagged == 1
    db_session.refresh(draft)
    assert draft.duplicate_of_task_id == existing.id
    assert draft.duplicate_reason == "Той самий дефект логіну."
    assert draft.dedup_checked_at is not None
    assert draft.status == TaskStatus.DRAFT  # flagging is a suggestion, never a state change


def test_candidate_prompt_carries_the_jira_key_of_an_already_filed_ticket(db_session) -> None:
    old = _meeting(db_session, "Sprint 1")
    _task(db_session, old, "Fix login timeout", "session expires",
          status=TaskStatus.APPROVED, jira_issue_key="CRM-42")
    new = _meeting(db_session, "Sprint 2")
    _task(db_session, new, "Fix login timeout", "session expires")

    client = _verdict_client(DuplicateVerdict(duplicate_of=None, reason="no"))
    with patch("app.llm.dedup.get_client", return_value=client):
        flag_duplicates_for_meeting(db_session, new)

    messages = client.chat.completions.create.call_args.kwargs["messages"]
    assert [m["role"] for m in messages] == ["system", "user"]  # one leading system message
    assert "1. [CRM-42 · approved] Fix login timeout" in messages[1]["content"]


def test_out_of_range_verdict_flags_nothing_but_still_marks_checked(db_session) -> None:
    old = _meeting(db_session, "Sprint 1")
    _task(db_session, old, "Fix login timeout", "session expires")
    new = _meeting(db_session, "Sprint 2")
    draft = _task(db_session, new, "Fix login timeout", "session expires")

    client = _verdict_client(DuplicateVerdict(duplicate_of=7, reason="hallucinated"))
    with patch("app.llm.dedup.get_client", return_value=client):
        flagged = flag_duplicates_for_meeting(db_session, new)

    assert flagged == 0
    client.chat.completions.create.assert_called_once()  # a candidate WAS shown to the model
    db_session.refresh(draft)
    assert draft.duplicate_of_task_id is None
    assert draft.duplicate_reason is None
    assert draft.dedup_checked_at is not None  # checked and cleared, not left for a retry


def test_second_run_does_not_ask_the_llm_again(db_session) -> None:
    old = _meeting(db_session, "Sprint 1")
    _task(db_session, old, "Fix login timeout", "session expires")
    new = _meeting(db_session, "Sprint 2")
    _task(db_session, new, "Fix login timeout", "session expires")

    client = _verdict_client(DuplicateVerdict(duplicate_of=1, reason="same"))
    with patch("app.llm.dedup.get_client", return_value=client):
        flag_duplicates_for_meeting(db_session, new)
        assert client.chat.completions.create.call_count == 1
        assert flag_duplicates_for_meeting(db_session, new) == 0
        assert client.chat.completions.create.call_count == 1  # Retry = resume, not restart


def test_no_candidates_means_no_llm_call(db_session) -> None:
    new = _meeting(db_session, "Sprint 2")
    draft = _task(db_session, new, "Совершенно уникальная задача", "нічого схожого")

    client = MagicMock()
    with patch("app.llm.dedup.get_client", return_value=client):
        assert flag_duplicates_for_meeting(db_session, new) == 0

    client.chat.completions.create.assert_not_called()
    db_session.refresh(draft)
    assert draft.dedup_checked_at is not None


def test_candidates_exclude_same_meeting_rejected_and_merged(db_session) -> None:
    old = _meeting(db_session, "Sprint 1")
    _task(db_session, old, "Fix login timeout", "rejected twin", status=TaskStatus.REJECTED)
    _task(db_session, old, "Fix login timeout", "merged twin", status=TaskStatus.MERGED)
    kept = _task(db_session, old, "Fix login timeout", "live twin", status=TaskStatus.APPROVED)
    new = _meeting(db_session, "Sprint 2")
    sibling = _task(db_session, new, "Fix login timeout", "same meeting sibling")
    draft = _task(db_session, new, "Fix login timeout", "session expires")

    candidates = _candidate_tasks(db_session, draft)

    ids = [c.id for c in candidates]
    assert ids == [kept.id]
    assert sibling.id not in ids and draft.id not in ids


def test_llm_failure_leaves_the_task_unchecked_and_processes_the_rest(db_session) -> None:
    old = _meeting(db_session, "Sprint 1")
    existing = _task(db_session, old, "Fix login timeout", "session expires")
    new = _meeting(db_session, "Sprint 2")
    first = _task(db_session, new, "Fix login timeout", "session expires")
    second = _task(db_session, new, "Fix login timeout badly", "session expires")

    client = MagicMock()
    client.chat.completions.create.side_effect = [
        RuntimeError("LM Studio is not running"),
        DuplicateVerdict(duplicate_of=1, reason="same bug"),
    ]
    with patch("app.llm.dedup.get_client", return_value=client):
        flagged = flag_duplicates_for_meeting(db_session, new)  # must not raise

    assert flagged == 1
    db_session.refresh(first)
    db_session.refresh(second)
    assert first.dedup_checked_at is None  # a Retry gets another shot at it
    assert first.duplicate_of_task_id is None
    assert second.dedup_checked_at is not None
    assert second.duplicate_of_task_id == existing.id


def test_only_drafts_are_checked(db_session) -> None:
    old = _meeting(db_session, "Sprint 1")
    _task(db_session, old, "Fix login timeout", "session expires")
    new = _meeting(db_session, "Sprint 2")
    approved = _task(db_session, new, "Fix login timeout", "already approved",
                     status=TaskStatus.APPROVED)

    client = MagicMock()
    with patch("app.llm.dedup.get_client", return_value=client):
        assert flag_duplicates_for_meeting(db_session, new) == 0

    client.chat.completions.create.assert_not_called()
    db_session.refresh(approved)
    assert approved.dedup_checked_at is None
