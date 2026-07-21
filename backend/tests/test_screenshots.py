"""Unit tests for app/pipeline/screenshots.py — every subprocess.run is mocked;
the suite must pass on a machine without ffmpeg/ffprobe on PATH."""
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.core.config import settings
from app.db.models import Task
from app.pipeline.screenshots import (
    capture_frame,
    delete_screenshot_files,
    frame_times,
    generate_for_task,
    probe_video_duration,
)


@pytest.fixture(autouse=True)
def no_real_ffmpeg(monkeypatch):
    """Fail loudly if a test reaches subprocess.run without mocking it first."""

    def _forbid(*args, **kwargs):
        raise AssertionError("test invoked real subprocess.run — mock it")

    monkeypatch.setattr("app.pipeline.screenshots.subprocess.run", _forbid)


# --- frame_times: clamping + de-duplication ---------------------------------


def test_frame_times_clamps_negative_and_dedupes() -> None:
    assert frame_times(-3.0, 600.0) == [0.0, 7.0, 17.0]


def test_frame_times_clamps_to_duration_and_dedupes() -> None:
    assert frame_times(1000.0, 100.0) == [99.5]


def test_frame_times_mid_video_happy_path() -> None:
    assert frame_times(60.0, 600.0) == [55.0, 60.0, 70.0, 80.0]


# --- capture_frame ----------------------------------------------------------


def test_capture_frame_builds_expected_argv_and_renames(tmp_path, monkeypatch) -> None:
    seen: dict = {}

    def fake_run(cmd, **kwargs):
        seen["cmd"] = cmd
        Path(cmd[-1]).write_bytes(b"\xff\xd8jpeg")
        return SimpleNamespace(returncode=0, stderr="")

    monkeypatch.setattr("app.pipeline.screenshots.subprocess.run", fake_run)
    target = tmp_path / "42" / "frame_0.jpg"
    assert capture_frame(Path("/media/video.mp4"), 55.0, target) is True
    assert target.read_bytes() == b"\xff\xd8jpeg"
    assert not target.with_name("frame_0.part.jpg").exists()  # atomically renamed

    cmd = seen["cmd"]
    assert cmd[0] == "ffmpeg"
    assert cmd.index("-ss") < cmd.index("-i")  # input-seek: fast
    assert cmd[cmd.index("-ss") + 1] == "55.000"
    assert cmd[cmd.index("-i") + 1] == "/media/video.mp4"
    assert cmd[cmd.index("-frames:v") + 1] == "1"
    # ffmpeg infers output format from the extension, so the temp file must keep .jpg
    assert cmd[-1].endswith("frame_0.part.jpg")


def test_capture_frame_nonzero_exit_returns_false_and_cleans_up(tmp_path, monkeypatch) -> None:
    def fake_run(cmd, **kwargs):
        Path(cmd[-1]).write_bytes(b"partial")
        return SimpleNamespace(returncode=1, stderr="boom")

    monkeypatch.setattr("app.pipeline.screenshots.subprocess.run", fake_run)
    target = tmp_path / "frame_0.jpg"
    assert capture_frame(Path("/v.mp4"), 1.0, target) is False
    assert not target.exists()
    assert not target.with_name("frame_0.jpg.part").exists()


def test_capture_frame_missing_ffmpeg_returns_false(tmp_path, monkeypatch) -> None:
    def fake_run(cmd, **kwargs):
        raise FileNotFoundError("ffmpeg not on PATH")

    monkeypatch.setattr("app.pipeline.screenshots.subprocess.run", fake_run)
    assert capture_frame(Path("/v.mp4"), 1.0, tmp_path / "frame_0.jpg") is False


def test_capture_frame_empty_output_returns_false_and_cleans_up(tmp_path, monkeypatch) -> None:
    def fake_run(cmd, **kwargs):
        Path(cmd[-1]).touch()  # zero-byte "frame"
        return SimpleNamespace(returncode=0, stderr="")

    monkeypatch.setattr("app.pipeline.screenshots.subprocess.run", fake_run)
    target = tmp_path / "frame_0.jpg"
    assert capture_frame(Path("/v.mp4"), 1.0, target) is False
    assert not target.exists()
    assert not target.with_name("frame_0.jpg.part").exists()


# --- probe_video_duration ---------------------------------------------------


def _probe_fake(duration_out: str = "600.5", codec_out: str = "video"):
    def fake_run(cmd, **kwargs):
        if "format=duration" in cmd:
            return SimpleNamespace(returncode=0, stdout=duration_out + "\n", stderr="")
        assert "stream=codec_type" in cmd
        return SimpleNamespace(returncode=0, stdout=codec_out + "\n", stderr="")

    return fake_run


def test_probe_video_duration_success(monkeypatch) -> None:
    monkeypatch.setattr("app.pipeline.screenshots.subprocess.run", _probe_fake())
    assert probe_video_duration(Path("/v.mp4")) == 600.5


def test_probe_video_duration_none_without_video_stream(monkeypatch) -> None:
    # ffprobe prints the container duration even for audio-only files; the
    # codec_type probe coming back empty must yield None.
    monkeypatch.setattr("app.pipeline.screenshots.subprocess.run", _probe_fake(codec_out=""))
    assert probe_video_duration(Path("/a.mp3")) is None


# --- generate_for_task ------------------------------------------------------


def test_generate_for_task_no_timestamp_returns_empty(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    task = Task(id=7, project_id=1, title="t", source_timestamp=None)
    assert generate_for_task(task, Path("/v.mp4"), 600.0) == []


def test_generate_for_task_skips_failed_frames_keeps_positions(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(settings, "data_dir", tmp_path)

    def fake_capture(source: Path, t: float, target: Path) -> bool:
        return t != 60.0  # the position-1 grab fails; others succeed

    monkeypatch.setattr("app.pipeline.screenshots.capture_frame", fake_capture)
    task = Task(id=7, project_id=1, title="t", source_timestamp=60.0)
    rows = generate_for_task(task, Path("/v.mp4"), 600.0)
    assert [(r.position, r.t_sec) for r in rows] == [(0, 55.0), (2, 70.0), (3, 80.0)]
    assert all(r.task_id == 7 for r in rows)
    assert rows[0].path == str(tmp_path / "screenshots" / "7" / "frame_0.jpg")


# --- delete_screenshot_files ------------------------------------------------


def test_delete_screenshot_files_removes_dir_and_tolerates_missing(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    task = Task(id=9, project_id=1, title="t")
    frame_dir = settings.screenshots_dir / "9"
    frame_dir.mkdir(parents=True)
    (frame_dir / "frame_0.jpg").write_bytes(b"x")

    delete_screenshot_files(task)
    assert not frame_dir.exists()
    delete_screenshot_files(task)  # missing dir is a silent no-op
