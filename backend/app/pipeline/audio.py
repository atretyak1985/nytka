import subprocess
from pathlib import Path


class AudioExtractionError(RuntimeError):
    pass


def extract_audio(source: Path, target_wav: Path) -> Path:
    """Extract 16kHz mono wav via ffmpeg CLI (sidecar). Atomic: temp file + rename."""
    target_wav.parent.mkdir(parents=True, exist_ok=True)
    tmp = target_wav.with_name(target_wav.name + ".part")
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
        "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", str(tmp),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        tmp.unlink(missing_ok=True)
        raise AudioExtractionError(f"ffmpeg failed: {result.stderr[-2000:]}")
    tmp.rename(target_wav)
    return target_wav
