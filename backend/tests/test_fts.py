"""FTS index: trigger sync, project scoping and query sanitisation."""
from sqlalchemy import text

from app.db.fts import fts_query, search_project
from app.db.models import BriefStatus, Meeting, MeetingBrief, Project, Task, TranscriptSegment


def _meeting(db, project_id: int = 1, title: str = "Sprint sync") -> Meeting:
    meeting = Meeting(project_id=project_id, title=title, source_filename="m.mp4", media_path="/x")
    db.add(meeting)
    db.commit()
    return meeting


def _index_rows(db, kind: str | None = None) -> list[dict]:
    sql = "SELECT kind, project_id, meeting_id, ref_id, t_start, text FROM search_index"
    params: dict = {}
    if kind:
        sql += " WHERE kind = :kind"
        params["kind"] = kind
    return [dict(r) for r in db.execute(text(sql), params).mappings().all()]


def test_segment_insert_lands_in_index(db_session) -> None:
    meeting = _meeting(db_session)
    db_session.add(
        TranscriptSegment(meeting_id=meeting.id, t_start=42.0, t_end=48.0, text="обговорили авторизацію")
    )
    db_session.commit()

    rows = _index_rows(db_session, "segment")
    assert len(rows) == 1
    assert rows[0]["project_id"] == 1
    assert rows[0]["meeting_id"] == meeting.id
    assert rows[0]["t_start"] == 42.0
    assert rows[0]["text"] == "обговорили авторизацію"


def test_task_insert_update_delete_sync_index(db_session) -> None:
    meeting = _meeting(db_session)
    task = Task(
        project_id=1, meeting_id=meeting.id, title="Полагодити логін",
        description="кнопка не працює", source_timestamp=10.0,
    )
    db_session.add(task)
    db_session.commit()

    rows = _index_rows(db_session, "task")
    assert len(rows) == 1
    assert rows[0]["text"] == "Полагодити логін кнопка не працює"
    assert rows[0]["t_start"] == 10.0

    task.title = "Полагодити реєстрацію"
    db_session.commit()
    rows = _index_rows(db_session, "task")
    assert len(rows) == 1  # replaced, not duplicated
    assert rows[0]["text"] == "Полагодити реєстрацію кнопка не працює"

    db_session.delete(task)
    db_session.commit()
    assert _index_rows(db_session, "task") == []


def test_segment_text_update_and_delete_sync_index(db_session) -> None:
    meeting = _meeting(db_session)
    seg = TranscriptSegment(meeting_id=meeting.id, t_start=1.0, t_end=2.0, text="перший варіант")
    db_session.add(seg)
    db_session.commit()

    seg.text = "виправлений варіант"
    db_session.commit()
    rows = _index_rows(db_session, "segment")
    assert len(rows) == 1
    assert rows[0]["text"] == "виправлений варіант"

    db_session.delete(seg)
    db_session.commit()
    assert _index_rows(db_session, "segment") == []


def test_meeting_delete_cascades_segments_and_brief_out_of_index(db_session) -> None:
    from app.db.fts import index_brief

    meeting = _meeting(db_session)
    db_session.add(TranscriptSegment(meeting_id=meeting.id, t_start=0.0, t_end=5.0, text="щось сказано"))
    brief = MeetingBrief(
        meeting_id=meeting.id, summary="Підсумок зустрічі", status=BriefStatus.READY,
    )
    db_session.add(brief)
    db_session.commit()
    index_brief(db_session, brief)
    db_session.commit()
    assert len(_index_rows(db_session)) == 2

    db_session.delete(meeting)  # segments + brief cascade via delete-orphan
    db_session.commit()
    assert _index_rows(db_session) == []


def test_search_is_scoped_to_one_project(db_session) -> None:
    other = Project(name="Other")
    db_session.add(other)
    db_session.commit()
    mine = _meeting(db_session, project_id=1, title="Mine")
    theirs = _meeting(db_session, project_id=other.id, title="Theirs")
    db_session.add_all([
        TranscriptSegment(meeting_id=mine.id, t_start=0.0, t_end=1.0, text="авторизація через OAuth"),
        TranscriptSegment(meeting_id=theirs.id, t_start=0.0, t_end=1.0, text="авторизація через SAML"),
    ])
    db_session.commit()

    hits = search_project(db_session, 1, "авторизація")
    assert len(hits) == 1
    assert hits[0]["meeting_id"] == mine.id
    assert "OAuth" in hits[0]["text"]


def test_search_returns_snippet_with_markers(db_session) -> None:
    meeting = _meeting(db_session)
    db_session.add(
        TranscriptSegment(meeting_id=meeting.id, t_start=7.0, t_end=9.0, text="ми вирішили про авторизацію все")
    )
    db_session.commit()
    hit = search_project(db_session, 1, "авторизацію")[0]
    assert "\x01" in hit["snippet"] and "\x02" in hit["snippet"]
    assert hit["t_start"] == 7.0
    assert hit["kind"] == "segment"


def test_search_kind_filter(db_session) -> None:
    meeting = _meeting(db_session)
    db_session.add_all([
        TranscriptSegment(meeting_id=meeting.id, t_start=0.0, t_end=1.0, text="деплой у пʼятницю"),
        Task(project_id=1, meeting_id=meeting.id, title="деплой", description="у пʼятницю"),
    ])
    db_session.commit()

    assert {h["kind"] for h in search_project(db_session, 1, "деплой")} == {"segment", "task"}
    only_segments = search_project(db_session, 1, "деплой", kinds=("segment",))
    assert [h["kind"] for h in only_segments] == ["segment"]


def test_question_with_punctuation_does_not_break_match(db_session) -> None:
    meeting = _meeting(db_session)
    db_session.add(
        TranscriptSegment(meeting_id=meeting.id, t_start=0.0, t_end=1.0, text="що там з авторизацією питали пʼять разів")
    )
    db_session.commit()
    hits = search_project(db_session, 1, "Що з авторизацією, п'ять?")
    assert hits  # apostrophes, commas and the question mark are stripped, not passed to FTS


def test_fts_operators_are_neutralised(db_session) -> None:
    meeting = _meeting(db_session)
    db_session.add(TranscriptSegment(meeting_id=meeting.id, t_start=0.0, t_end=1.0, text="релиз плану"))
    db_session.commit()
    # None of these may raise sqlite3.OperationalError.
    for raw in ['OR', '"', '*', 'релиз OR (NEAR "x" *)', 'foo AND NOT bar', '^', '-']:
        search_project(db_session, 1, raw)

    assert fts_query('a OR "b" *') == '"a"* "or"* "b"*'
    assert fts_query("Що з авторизацією, п'ять?") == '"що"* "з"* "авторизацією"* "п"* "ять"*'
    assert fts_query("") == ""
    assert fts_query("...") == ""
    assert fts_query("a b", any_token=True) == '"a"* OR "b"*'
    assert len(fts_query(" ".join(str(i) for i in range(50))).split()) == 12  # token cap


def test_and_miss_falls_back_to_or(db_session) -> None:
    meeting = _meeting(db_session)
    db_session.add(
        TranscriptSegment(meeting_id=meeting.id, t_start=0.0, t_end=1.0, text="ми вирішили використовувати OAuth")
    )
    db_session.commit()
    # "бюджет" appears nowhere: AND yields nothing, OR still finds the OAuth line.
    hits = search_project(db_session, 1, "що ми вирішили про бюджет")
    assert hits and hits[0]["kind"] == "segment"


def test_exclude_meeting_id_drops_rows_before_ranking(db_session) -> None:
    """Filtering the excluded meeting out AFTER the search is not equivalent: its rows
    would satisfy the AND pass and starve the OR fallback (the bug the dedup pass hit)."""
    old = _meeting(db_session, title="Sprint 1")
    new = _meeting(db_session, title="Sprint 2")
    db_session.add_all([
        Task(project_id=1, meeting_id=old.id, title="Fix login timeout", description="session expires"),
        Task(project_id=1, meeting_id=new.id, title="Fix login timeout", description="expires too fast"),
        Task(project_id=1, meeting_id=None, title="Fix login timeout", description="filed by hand"),
    ])
    db_session.commit()

    raw = "Fix login timeout expires too fast"
    assert {h["meeting_id"] for h in search_project(db_session, 1, raw, kinds=("task",))} == {new.id}
    kept = search_project(db_session, 1, raw, kinds=("task",), exclude_meeting_id=new.id)
    assert {h["meeting_id"] for h in kept} == {old.id, None}  # manual tasks are never excluded


def test_empty_query_returns_no_hits(db_session) -> None:
    meeting = _meeting(db_session)
    db_session.add(TranscriptSegment(meeting_id=meeting.id, t_start=0.0, t_end=1.0, text="текст"))
    db_session.commit()
    assert search_project(db_session, 1, "   ") == []
    assert search_project(db_session, 1, "?!,.") == []
