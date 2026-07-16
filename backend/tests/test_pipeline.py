import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest

from app.db.models import Meeting, MeetingStatus, TranscriptSegment
from app.pipeline.audio import extract_audio
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
