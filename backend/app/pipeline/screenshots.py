"""Capture video frames near a task's source_timestamp via the ffmpeg CLI (sidecar).

Best-effort by design: every public function returns instead of raising, so a
broken video can never fail the pipeline or an API request.
"""
from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

from app.core.config import settings
from app.db.models import Task, TaskScreenshot

logger = logging.getLogger(__name__)

# Offsets relative to source_timestamp. The timestamp marks where the discussion
# STARTS (Whisper + LLM error is a few seconds): -5 catches the screen already
# visible when the topic came up; +10/+20 sample the screen share evolving while
# the task is discussed.
FRAME_OFFSETS: tuple[float, ...] = (-5.0, 0.0, 10.0, 20.0)
END_MARGIN = 0.5      # never seek into the last half-second
MIN_GAP = 1.0         # drop offsets that collapse to (nearly) the same clamped time
FFMPEG_TIMEOUT = 60   # per-frame; input-seek grabs normally take <1 s


def probe_video_duration(source: Path) -> float | None:
    """Duration in seconds of the first VIDEO stream, or None when there is no
    video stream / probe fails (audio-only upload, corrupt file, ffprobe absent)."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "format=duration", "-of", "csv=p=0", str(source)],
            capture_output=True, text=True, timeout=60,
        )
    except (FileNotFoundError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    # ffprobe prints the container duration even when -select_streams matches nothing,
    # so confirm a video stream exists separately.
    has_video = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(source)],
        capture_output=True, text=True, timeout=60,
    )
    if has_video.returncode != 0 or "video" not in has_video.stdout:
        return None
    try:
        return float(result.stdout.strip())
    except ValueError:
        return None


def frame_times(source_timestamp: float, duration: float) -> list[float]:
    """Clamped, de-duplicated capture times for one task."""
    times: list[float] = []
    upper = max(0.0, duration - END_MARGIN)
    for offset in FRAME_OFFSETS:
        t = min(max(source_timestamp + offset, 0.0), upper)
        if all(abs(t - existing) >= MIN_GAP for existing in times):
            times.append(t)
    return times


def capture_frame(source: Path, t: float, target: Path) -> bool:
    """One JPEG at time t. Input-seek (-ss before -i) is fast; keyframe-imprecise
    by ±1–2 s, which is fine for context screenshots. Atomic: temp file + rename."""
    target.parent.mkdir(parents=True, exist_ok=True)
    # Keep the .jpg suffix (not appended after it) — ffmpeg picks its output muxer
    # from the output filename's extension, so "frame_0.jpg.part" fails with
    # "Unable to choose an output format" on every call.
    tmp = target.with_name(f"{target.stem}.part{target.suffix}")
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-ss", f"{t:.3f}", "-i", str(source),
        "-frames:v", "1", "-q:v", "4", "-vf", "scale='min(1280,iw)':-2",
        str(tmp),
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=FFMPEG_TIMEOUT)
    except (FileNotFoundError, subprocess.SubprocessError):
        tmp.unlink(missing_ok=True)
        return False
    if result.returncode != 0 or not tmp.exists() or tmp.stat().st_size == 0:
        logger.warning("frame capture failed at %.1fs for %s: %s", t, source, result.stderr[-500:])
        tmp.unlink(missing_ok=True)
        return False
    tmp.rename(target)
    return True


def generate_for_task(task: Task, source: Path, duration: float) -> list[TaskScreenshot]:
    """Capture frames for one task; returns unsaved TaskScreenshot rows (may be [])."""
    if task.source_timestamp is None:
        return []
    rows: list[TaskScreenshot] = []
    for position, t in enumerate(frame_times(task.source_timestamp, duration)):
        target = settings.screenshots_dir / str(task.id) / f"frame_{position}.jpg"
        if capture_frame(source, t, target):
            rows.append(TaskScreenshot(task_id=task.id, path=str(target), t_sec=t, position=position))
    return rows


def delete_screenshot_files(task: Task) -> None:
    """Remove the task's screenshot directory. Call BEFORE deleting the task row."""
    shutil.rmtree(settings.screenshots_dir / str(task.id), ignore_errors=True)
