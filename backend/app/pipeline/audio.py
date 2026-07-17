import subprocess
from pathlib import Path


class AudioExtractionError(RuntimeError):
    pass


NO_AUDIO_MESSAGE = "This recording has no audio track — there is nothing to transcribe."


def _probe_has_audio(source: Path) -> bool | None:
    """Whether the media has an audio stream.

    Returns True/False when ffprobe can inspect the file, or None when the probe
    itself fails (missing/corrupt file, ffprobe absent) — in that case we defer to
    ffmpeg so its own error surfaces instead of a misleading "no audio" message.
    """
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a",
             "-show_entries", "stream=index", "-of", "csv=p=0", str(source)],
            capture_output=True, text=True, timeout=60,
        )
    except (FileNotFoundError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    return result.stdout.strip() != ""


def extract_audio(source: Path, target_wav: Path) -> Path:
    """Extract 16kHz mono wav via ffmpeg CLI (sidecar). Atomic: temp file + rename."""
    target_wav.parent.mkdir(parents=True, exist_ok=True)

    # A silent screen recording has no audio stream; ffmpeg then writes an empty
    # WAV and fails with a cryptic "Output file does not contain any stream".
    # Catch it up front with a message the user can act on.
    if _probe_has_audio(source) is False:
        raise AudioExtractionError(NO_AUDIO_MESSAGE)

    tmp = target_wav.with_name(target_wav.name + ".part")
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
        "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", str(tmp),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        tmp.unlink(missing_ok=True)
        stderr = result.stderr[-2000:]
        # Fallback for when ffprobe was unavailable and the file simply has no audio.
        if "does not contain any stream" in stderr:
            raise AudioExtractionError(NO_AUDIO_MESSAGE)
        raise AudioExtractionError(f"ffmpeg failed: {stderr}")
    tmp.rename(target_wav)
    return target_wav
