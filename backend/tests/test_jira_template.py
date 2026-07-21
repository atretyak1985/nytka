from unittest.mock import patch

from app.db.models import Meeting, Project, Task
from app.jira import service
from app.jira.service import _area_to_labels, _labels_for, _summary_for, build_preview, push_task


def test_area_to_labels():
    assert _area_to_labels("[Mission Management][Wizard]") == ["mission-management", "wizard"]
    assert _area_to_labels("[In-mission]") == ["in-mission"]
    assert _area_to_labels("") == []


def test_summary_prefixes_area():
    assert _summary_for(Task(title="map jumps", area="[In-mission][Flight Control]")) == (
        "[In-mission][Flight Control] map jumps"
    )
    assert _summary_for(Task(title="plain", area="")) == "plain"


def _jira_project(db):
    project = db.get(Project, 1)
    project.jira_enabled = True
    project.jira_key = "OD"
    project.jira_base_url = "https://x.atlassian.net"
    project.jira_email = "a@b.c"
    project.jira_api_token = "tok"
    db.commit()
    return project


def _committed_meeting(db) -> Meeting:
    meeting = Meeting(project_id=1, title="demo", source_filename="d.mp4", media_path="/x")
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def test_labels_combine_static_demo_and_area(db_session):
    project = _jira_project(db_session)
    project.jira_static_labels = ["aware-created-by-robots"]
    project.jira_demo_label = True
    db_session.commit()
    meeting = _committed_meeting(db_session)
    task = Task(project_id=1, meeting_id=meeting.id, title="t", area="[In-mission][Flight Control]")
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    labels = _labels_for(project, task)
    assert "aware-created-by-robots" in labels
    assert any(label.startswith("demo-") for label in labels)
    assert "in-mission" in labels and "flight-control" in labels
    assert len(labels) == len(set(labels))  # de-duped


def test_build_preview_includes_labels_sprint_area(db_session):
    project = _jira_project(db_session)
    project.jira_static_labels = ["aware-created-by-robots"]
    project.jira_sprint_field = "customfield_10020"
    project.jira_sprint_id = 370
    db_session.commit()
    task = Task(project_id=1, title="defect", area="[Global]", assignee=None)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    preview = build_preview(db_session, task)
    assert preview["ok"] is True
    assert preview["summary"] == "[Global] defect"
    assert preview["area"] == "[Global]"
    assert "global" in preview["labels"]
    assert preview["sprint_id"] == 370


def test_build_preview_sprint_skipped_without_field(db_session):
    project = _jira_project(db_session)
    project.jira_sprint_id = 370  # field name blank -> skip
    db_session.commit()
    task = Task(project_id=1, title="t", assignee=None)
    db_session.add(task)
    db_session.commit()
    assert build_preview(db_session, task)["sprint_id"] is None


def test_description_appends_source_with_timestamp(db_session):
    _jira_project(db_session)
    meeting = _committed_meeting(db_session)
    task = Task(project_id=1, meeting_id=meeting.id, title="t", description="STR: x", source_timestamp=125.0, assignee=None)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    desc = build_preview(db_session, task)["description"]
    assert "STR: x" in desc
    assert "video 02:05" in desc


def test_push_records_dropped_conventions(db_session):
    _jira_project(db_session)
    task = Task(project_id=1, title="t", area="[Global]", assignee=None)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    with patch.object(service.jira_client, "create_issue", return_value=("OD-1", ["labels"])):
        push_task(db_session, task)
    assert task.jira_issue_key == "OD-1"
    assert "labels" in task.jira_sync_error


def test_demo_label_uses_recording_date_from_title(db_session):
    project = _jira_project(db_session)
    project.jira_demo_label = True
    db_session.commit()
    meeting = Meeting(project_id=1, title="2026-07-15_20-04-14", source_filename="d.mp4", media_path="/x")
    db_session.add(meeting)
    db_session.commit()
    task = Task(project_id=1, meeting_id=meeting.id, title="t")
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    assert "demo-2026-07-15" in _labels_for(project, task)


def test_demo_label_falls_back_to_upload_date_without_title_date(db_session):
    project = _jira_project(db_session)
    project.jira_demo_label = True
    db_session.commit()
    meeting = _committed_meeting(db_session)  # title "demo" — no date in it
    task = Task(project_id=1, meeting_id=meeting.id, title="t")
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    expected = f"demo-{meeting.created_at.date():%Y-%m-%d}"
    assert expected in _labels_for(project, task)


def test_demo_label_ignores_invalid_date_in_title(db_session):
    project = _jira_project(db_session)
    project.jira_demo_label = True
    db_session.commit()
    meeting = Meeting(project_id=1, title="9999-99-99 weird", source_filename="d.mp4", media_path="/x")
    db_session.add(meeting)
    db_session.commit()
    task = Task(project_id=1, meeting_id=meeting.id, title="t")
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    expected = f"demo-{meeting.created_at.date():%Y-%m-%d}"
    assert expected in _labels_for(project, task)


def test_task_extra_labels_merged_and_normalised(db_session):
    project = _jira_project(db_session)
    project.jira_static_labels = ["aware-created-by-robots"]
    db_session.commit()
    task = Task(project_id=1, title="t", labels=["User management", "hotfix", "HOTFIX"])
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    labels = _labels_for(project, task)
    assert "user-management" in labels
    assert "hotfix" in labels
    assert "aware-created-by-robots" in labels
    assert len(labels) == len(set(labels))  # normalised duplicates collapse
