import subprocess
from pathlib import Path


class AudioExtractionError(RuntimeError):
    pass


def extract_audio(source: Path, target_wav: Path) -> Path:
    """Extract 16kHz mono wav from any video/audio file via ffmpeg CLI (sidecar, no linking)."""
    target_wav.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-y", "-i", str(source),
        "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", str(target_wav),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise AudioExtractionError(f"ffmpeg failed: {result.stderr[-2000:]}")
    return target_wav
