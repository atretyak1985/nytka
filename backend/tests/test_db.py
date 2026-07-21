from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.models import Meeting, MeetingStatus, Task, TaskScreenshot, TaskStatus, TranscriptSegment
from app.db.seed import ensure_default_project


def make_session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)


def test_default_project_seeded() -> None:
    with make_session() as db:
        project = ensure_default_project(db)
        assert project.name == "My Project"
        assert project.llm_base_url == "http://127.0.0.1:1234/v1"
        # idempotent
        again = ensure_default_project(db)
        assert again.id == project.id


def test_meeting_task_segment_relations() -> None:
    with make_session() as db:
        project = ensure_default_project(db)
        meeting = Meeting(project_id=project.id, title="Standup", source_filename="a.mp4", media_path="/tmp/a.mp4")
        db.add(meeting)
        db.flush()
        assert meeting.status == MeetingStatus.QUEUED
        db.add(TranscriptSegment(meeting_id=meeting.id, t_start=0.0, t_end=2.5, text="hello"))
        task = Task(project_id=project.id, meeting_id=meeting.id, title="Do thing")
        db.add(task)
        db.flush()
        assert task.status == TaskStatus.DRAFT
        assert meeting.segments[0].speaker is None
        assert meeting.tasks[0].title == "Do thing"


def test_task_screenshots_ordering_and_cascade() -> None:
    with make_session() as db:
        project = ensure_default_project(db)
        task = Task(project_id=project.id, title="With frames")
        # Append out of order to prove the relationship orders by position.
        task.screenshots = [
            TaskScreenshot(path="/tmp/frame_1.jpg", t_sec=70.0, position=1),
            TaskScreenshot(path="/tmp/frame_0.jpg", t_sec=60.0, position=0),
        ]
        db.add(task)
        db.commit()
        db.refresh(task)
        assert [s.position for s in task.screenshots] == [0, 1]
        assert [s.path for s in task.screenshots] == ["/tmp/frame_0.jpg", "/tmp/frame_1.jpg"]

        db.delete(task)
        db.commit()
        assert db.query(TaskScreenshot).count() == 0  # ORM cascade removed the rows
