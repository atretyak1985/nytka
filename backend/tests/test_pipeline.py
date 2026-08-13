import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest

from app.db.models import Meeting, MeetingStatus, Task, TaskScreenshot, TranscriptSegment
from app.pipeline.audio import AudioExtractionError, extract_audio
from app.pipeline.runner import run_pipeline_with_session
from app.pipeline.transcribe import pick_model_size


@pytest.fixture(scope="session")
def tone_wav(tmp_path_factory) -> Path:
    """1-second 440Hz tone; enough to drive ffmpeg+whisper code paths."""
    out = tmp_path_factory.mktemp("media") / "tone.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", str(out)],
        check=True, capture_output=True,
    )
    return out


@pytest.fixture(scope="session")
def silent_video(tmp_path_factory) -> Path:
    """Video-only .mov (no audio stream), like a muted screen recording."""
    out = tmp_path_factory.mktemp("media") / "noaudio.mov"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=duration=1:size=64x64:rate=10", str(out)],
        check=True, capture_output=True,
    )
    return out


def test_pick_model_size() -> None:
    assert pick_model_size("tiny") == "tiny"
    assert pick_model_size("auto") in {"medium", "large-v3"}


def test_extract_audio_produces_16k_mono(tone_wav, tmp_path) -> None:
    wav = extract_audio(tone_wav, tmp_path / "out.wav")
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "stream=sample_rate,channels",
         "-of", "csv=p=0", str(wav)],
        check=True, capture_output=True, text=True,
    )
    assert probe.stdout.strip() == "16000,1"


def test_extract_audio_no_audio_stream(silent_video, tmp_path) -> None:
    with pytest.raises(AudioExtractionError, match="no audio track"):
        extract_audio(silent_video, tmp_path / "out.wav")
    assert not (tmp_path / "out.wav").exists()


def _make_meeting(db, media_path: str) -> Meeting:
    meeting = Meeting(project_id=1, title="t", source_filename="t.wav", media_path=media_path)
    db.add(meeting)
    db.commit()
    return meeting


def test_run_pipeline_happy_path(db_session, tone_wav, monkeypatch) -> None:
    monkeypatch.setattr("app.pipeline.transcribe.settings.whisper_model", "tiny", raising=False)
    meeting = _make_meeting(db_session, str(tone_wav))
    with patch("app.pipeline.runner.extract_tasks_for_meeting", return_value=0) as mock_extract:
        run_pipeline_with_session(db_session, meeting.id)
    db_session.refresh(meeting)
    assert meeting.status == MeetingStatus.DONE
    assert meeting.processing_started_at is not None
    assert meeting.progress is None  # cleared once done
    mock_extract.assert_called_once()
    # tone has no speech; segments may be empty — that's fine, status matters


def test_run_pipeline_error_state(db_session) -> None:
    meeting = _make_meeting(db_session, "/nonexistent/file.mp4")
    run_pipeline_with_session(db_session, meeting.id)
    db_session.refresh(meeting)
    assert meeting.status == MeetingStatus.ERROR
    assert meeting.error_message


def test_retry_resumes_after_transcription(db_session, tone_wav) -> None:
    meeting = _make_meeting(db_session, str(tone_wav))
    db_session.add(TranscriptSegment(meeting_id=meeting.id, t_start=0, t_end=1, text="already here"))
    db_session.commit()
    with patch("app.pipeline.runner.extract_tasks_for_meeting", return_value=1) as mock_extract, \
         patch("app.pipeline.runner.transcribe_meeting") as mock_transcribe:
        run_pipeline_with_session(db_session, meeting.id)
    mock_transcribe.assert_not_called()
    mock_extract.assert_called_once()
    db_session.refresh(meeting)
    assert meeting.status == MeetingStatus.DONE


def test_pipeline_survives_diarization_failure(db_session, tmp_path, monkeypatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "diarization", "auto")
    media = tmp_path / "m.mp4"
    media.write_bytes(b"fake")
    meeting = _make_meeting(db_session, str(media))
    db_session.add(TranscriptSegment(meeting_id=meeting.id, t_start=0, t_end=1, text="seg"))
    db_session.commit()
    # Real assign_speakers runs; the diarization engine itself explodes.
    with patch("app.pipeline.runner.extract_audio"), \
         patch("app.pipeline.runner.extract_tasks_for_meeting", return_value=0), \
         patch("app.pipeline.diarize.models_available", return_value=True), \
         patch("app.pipeline.diarize.diarize_wav", side_effect=RuntimeError("onnx exploded")):
        run_pipeline_with_session(db_session, meeting.id)
    db_session.refresh(meeting)
    assert meeting.status == MeetingStatus.DONE  # diarization failure swallowed
    assert meeting.error_message is None


def test_pipeline_skips_diarization_when_speakers_exist(db_session, tmp_path) -> None:
    media = tmp_path / "m.mp4"
    media.write_bytes(b"fake")
    meeting = _make_meeting(db_session, str(media))
    db_session.add(TranscriptSegment(
        meeting_id=meeting.id, t_start=0, t_end=1, text="seg", speaker="SPEAKER_00",
    ))
    db_session.commit()
    with patch("app.pipeline.runner.extract_audio"), \
         patch("app.pipeline.runner.extract_tasks_for_meeting", return_value=0), \
         patch("app.pipeline.runner.assign_speakers") as mock_assign:
        run_pipeline_with_session(db_session, meeting.id)
    mock_assign.assert_not_called()  # idempotent: labels already present
    db_session.refresh(meeting)
    assert meeting.status == MeetingStatus.DONE


def _make_screenshot_meeting(db, media: Path) -> tuple[Meeting, Task]:
    """Meeting with a segment (skips transcribe) and one timestamped task (skips extract)."""
    meeting = _make_meeting(db, str(media))
    meeting.duration_sec = 600.0
    db.add(TranscriptSegment(meeting_id=meeting.id, t_start=0, t_end=1, text="seg"))
    task = Task(project_id=1, meeting_id=meeting.id, title="t", source_timestamp=60.0)
    db.add(task)
    db.commit()
    return meeting, task


def test_pipeline_survives_screenshot_failure(db_session, tmp_path) -> None:
    media = tmp_path / "m.mp4"
    media.write_bytes(b"fake")
    meeting, _task = _make_screenshot_meeting(db_session, media)
    with patch("app.pipeline.runner.extract_audio"), \
         patch("app.pipeline.runner.generate_for_task", side_effect=RuntimeError("ffmpeg exploded")):
        run_pipeline_with_session(db_session, meeting.id)
    db_session.refresh(meeting)
    assert meeting.status == MeetingStatus.DONE  # screenshot failure swallowed


def test_pipeline_commits_screenshot_rows_idempotently(db_session, tmp_path) -> None:
    media = tmp_path / "m.mp4"
    media.write_bytes(b"fake")
    meeting, task = _make_screenshot_meeting(db_session, media)

    def fake_generate(t: Task, source: Path, duration: float) -> list[TaskScreenshot]:
        return [
            TaskScreenshot(task_id=t.id, path=f"/tmp/{t.id}/frame_0.jpg", t_sec=55.0, position=0),
            TaskScreenshot(task_id=t.id, path=f"/tmp/{t.id}/frame_1.jpg", t_sec=60.0, position=1),
        ]

    with patch("app.pipeline.runner.extract_audio"), \
         patch("app.pipeline.runner.generate_for_task", side_effect=fake_generate) as mock_gen:
        run_pipeline_with_session(db_session, meeting.id)
        assert db_session.query(TaskScreenshot).filter_by(task_id=task.id).count() == 2
        run_pipeline_with_session(db_session, meeting.id)  # rerun: task already has frames
    assert db_session.query(TaskScreenshot).filter_by(task_id=task.id).count() == 2
    assert mock_gen.call_count == 1  # idempotent: not called again on the rerun
    db_session.refresh(meeting)
    assert meeting.status == MeetingStatus.DONE


def test_pipeline_skips_screenshots_for_audio_only(db_session, tmp_path) -> None:
    media = tmp_path / "m.mp3"
    media.write_bytes(b"fake")
    meeting, _task = _make_screenshot_meeting(db_session, media)
    meeting.duration_sec = None  # transcription did not set it; probe decides
    db_session.commit()
    with patch("app.pipeline.runner.extract_audio"), \
         patch("app.pipeline.runner.probe_video_duration", return_value=None) as mock_probe, \
         patch("app.pipeline.runner.generate_for_task") as mock_gen:
        run_pipeline_with_session(db_session, meeting.id)
    mock_probe.assert_called_once()
    mock_gen.assert_not_called()  # no video stream — zero capture attempts
    db_session.refresh(meeting)
    assert meeting.status == MeetingStatus.DONE
