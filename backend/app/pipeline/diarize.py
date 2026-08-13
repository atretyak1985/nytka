"""Offline speaker diarization via sherpa-onnx (ONNX Runtime, CPU, no gated models).

Diarization is an enhancement, exactly like screenshot capture (_generate_screenshots
in app/pipeline/runner.py): it never fails the pipeline. With NYTKA_DIARIZATION=off or
missing models the step is skipped with an INFO log and segments keep speaker=None.

Models are downloaded once via `python -m app.pipeline.diarize --download`
(or `make -C infrastructure install-diarization`).
"""
from __future__ import annotations

import argparse
import importlib.util
import logging
import tarfile
import tempfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import httpx

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Meeting, TranscriptSegment

logger = logging.getLogger(__name__)

SEGMENTATION_FILENAME = "segmentation.onnx"
EMBEDDING_FILENAME = "embedding.onnx"

# ONNX export of pyannote segmentation-3.0 (~6 MB), fetched by direct URL — no HF token.
SEGMENTATION_URL = (
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/"
    "speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2"
)
# 3D-Speaker ERes2Net speaker-embedding model (~38 MB). The release tag really is
# spelled "recongition" upstream — do not "fix" it.
EMBEDDING_URL = (
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/"
    "speaker-recongition-models/3dspeaker_speech_eres2net_base_sv_zh-cn_3dspeaker_16k.onnx"
)


@dataclass(frozen=True)
class SpeakerTurn:
    start: float
    end: float
    label: str  # "SPEAKER_00", ...


def models_available() -> bool:
    """True when both ONNX models exist on disk — checked before importing sherpa_onnx."""
    d = settings.diarization_models_dir
    return (d / SEGMENTATION_FILENAME).exists() and (d / EMBEDDING_FILENAME).exists()


def diarize_wav(wav_path: Path, max_speakers: int) -> list[SpeakerTurn]:
    """Offline speaker diarization over the 16 kHz mono WAV the pipeline already produced
    (app/pipeline/audio.py). Import of sherpa_onnx is lazy, like faster_whisper in
    transcribe.py."""
    import sherpa_onnx

    d = settings.diarization_models_dir
    config = sherpa_onnx.OfflineSpeakerDiarizationConfig(
        segmentation=sherpa_onnx.OfflineSpeakerSegmentationModelConfig(
            pyannote=sherpa_onnx.OfflineSpeakerSegmentationPyannoteModelConfig(
                model=str(d / SEGMENTATION_FILENAME)
            ),
        ),
        embedding=sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(d / EMBEDDING_FILENAME)),
        clustering=sherpa_onnx.FastClusteringConfig(num_clusters=-1, threshold=0.5),
        min_duration_on=0.3,
        min_duration_off=0.5,
    )
    diarizer = sherpa_onnx.OfflineSpeakerDiarization(config)
    samples, sample_rate = _read_wav(wav_path)
    if sample_rate != diarizer.sample_rate:
        raise ValueError(
            f"{wav_path} is {sample_rate} Hz but the diarizer expects {diarizer.sample_rate} Hz"
        )
    result = diarizer.process(samples).sort_by_start_time()
    turns = [
        SpeakerTurn(start=seg.start, end=seg.end, label=f"SPEAKER_{seg.speaker:02d}")
        for seg in result
    ]
    return _cap_speakers(turns, max_speakers)


def assign_speakers(db: Session, meeting: Meeting, wav_path: Path) -> int:
    """Label each TranscriptSegment with the speaker who holds the largest time overlap
    with it. Returns the number of labelled segments.

    Never raises: diarization is an enhancement, exactly like screenshot capture
    (see _generate_screenshots in app/pipeline/runner.py)."""
    try:
        if settings.diarization == "off":
            logger.info("diarization disabled (NYTKA_DIARIZATION=off); skipping meeting %s", meeting.id)
            return 0
        if not models_available():
            logger.info(
                "diarization models not found in %s; skipping meeting %s "
                "(run `make -C infrastructure install-diarization`)",
                settings.diarization_models_dir, meeting.id,
            )
            return 0
        turns = diarize_wav(wav_path, settings.diarization_max_speakers)
        if not turns:
            return 0
        labelled = 0
        for segment in db.scalars(
            select(TranscriptSegment).where(TranscriptSegment.meeting_id == meeting.id)
        ):
            label = _best_label(segment, turns)
            if label is not None:
                segment.speaker = label
                labelled += 1
        db.commit()
        logger.info("meeting %s: labelled %s segments across %s speaker turns",
                    meeting.id, labelled, len(turns))
        return labelled
    except Exception:  # noqa: BLE001 - diarization is decoration, never fail the pipeline
        logger.exception("diarization failed for meeting %s", meeting.id)
        db.rollback()
        return 0


def _download(url: str, dest: Path) -> None:
    """Stream a release asset to disk.

    httpx (not urllib) on purpose: urllib trusts the OS trust store, which on macOS
    leaves a python.org interpreter with no CA bundle -> CERTIFICATE_VERIFY_FAILED.
    httpx ships certifi, so this works on a clean machine.
    """
    with httpx.stream("GET", url, follow_redirects=True, timeout=120.0) as resp:
        resp.raise_for_status()
        with dest.open("wb") as out:
            for chunk in resp.iter_bytes(1024 * 1024):
                out.write(chunk)


def link_onnxruntime() -> str:
    """Make the onnxruntime shared library visible to the sherpa-onnx extension.

    The sherpa-onnx wheels do not bundle libonnxruntime; the extension looks for it
    next to itself (@rpath/../lib) while pip puts it inside the onnxruntime package.
    Without this link `import sherpa_onnx` dies with an ImportError at load time.
    Idempotent; returns a human-readable outcome for the installer output.
    """
    # find_spec, not import: importing sherpa_onnx is exactly what fails while the
    # library is missing, so locate both packages without executing them.
    packages = {}
    for name in ("sherpa_onnx", "onnxruntime"):
        spec = importlib.util.find_spec(name)
        if spec is None or not spec.submodule_search_locations:
            return f"skipped: {name} is not installed (uv sync --extra diarization)"
        packages[name] = Path(next(iter(spec.submodule_search_locations)))

    lib_dir = packages["sherpa_onnx"] / "lib"
    if not lib_dir.is_dir():
        return f"skipped: no sherpa_onnx lib dir at {lib_dir}"
    # macOS ships .dylib, Linux .so; the extension asks for the unversioned name.
    for pattern, linkname in (("libonnxruntime*.dylib", "libonnxruntime.dylib"),
                              ("libonnxruntime.so*", "libonnxruntime.so")):
        if (lib_dir / linkname).exists():
            return f"already linked: {lib_dir / linkname}"
        sources = sorted((packages["onnxruntime"] / "capi").glob(pattern))
        if sources:
            (lib_dir / linkname).symlink_to(sources[-1])
            return f"linked {lib_dir / linkname} -> {sources[-1]}"
    return "skipped: no onnxruntime shared library found (Windows install?)"


def download_models(target: Path) -> None:
    """CLI helper for `python -m app.pipeline.diarize --download`."""
    target.mkdir(parents=True, exist_ok=True)

    segmentation = target / SEGMENTATION_FILENAME
    if segmentation.exists():
        print(f"already present: {segmentation}")
    else:
        print(f"downloading segmentation model → {segmentation}")
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "segmentation.tar.bz2"
            _download(SEGMENTATION_URL, archive)
            with tarfile.open(archive, "r:bz2") as tar:
                member = next(m for m in tar.getmembers() if m.name.endswith("model.onnx"))
                extracted = tar.extractfile(member)
                assert extracted is not None
                segmentation.write_bytes(extracted.read())
        print(f"saved {segmentation} ({segmentation.stat().st_size // 1024} KiB)")

    embedding = target / EMBEDDING_FILENAME
    if embedding.exists():
        print(f"already present: {embedding}")
    else:
        print(f"downloading speaker-embedding model → {embedding}")
        _download(EMBEDDING_URL, embedding)
        print(f"saved {embedding} ({embedding.stat().st_size // 1024} KiB)")

    print(f"onnxruntime library: {link_onnxruntime()}")


def _best_label(segment: TranscriptSegment, turns: list[SpeakerTurn]) -> str | None:
    """Label with the largest total time overlap; None when nothing overlaps (silence/music)."""
    overlap_by_label: dict[str, float] = defaultdict(float)
    for turn in turns:
        overlap = min(segment.t_end, turn.end) - max(segment.t_start, turn.start)
        if overlap > 0:
            overlap_by_label[turn.label] += overlap
    if not overlap_by_label:
        return None
    return max(overlap_by_label.items(), key=lambda item: item[1])[0]


def _cap_speakers(turns: list[SpeakerTurn], max_speakers: int) -> list[SpeakerTurn]:
    """Keep the max_speakers labels with the most speech; drop turns of the rest.

    Over-segmentation on noisy audio can invent dozens of one-off "speakers" —
    an unlabelled segment is more honest than a bogus label."""
    talk_time: dict[str, float] = defaultdict(float)
    for turn in turns:
        talk_time[turn.label] += turn.end - turn.start
    if len(talk_time) <= max_speakers:
        return turns
    keep = {label for label, _ in
            sorted(talk_time.items(), key=lambda item: item[1], reverse=True)[:max_speakers]}
    logger.warning("diarization found %s speakers; keeping the %s most talkative",
                   len(talk_time), max_speakers)
    return [t for t in turns if t.label in keep]


def _read_wav(wav_path: Path) -> tuple["object", int]:
    """16-bit PCM mono WAV → (float32 samples in [-1, 1], sample rate)."""
    import wave

    import numpy as np

    with wave.open(str(wav_path), "rb") as f:
        if f.getnchannels() != 1 or f.getsampwidth() != 2:
            raise ValueError(f"{wav_path} is not 16-bit mono PCM (see app/pipeline/audio.py)")
        rate = f.getframerate()
        data = f.readframes(f.getnframes())
    samples = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
    return samples, rate


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Speaker diarization model management")
    parser.add_argument("--download", action="store_true", help="download the ONNX models")
    parser.add_argument("--target", type=Path, default=None,
                        help="model directory (default: NYTKA_DIARIZATION_MODEL_DIR or data/models/diarization)")
    args = parser.parse_args()
    if args.download:
        download_models(args.target or settings.diarization_models_dir)
    else:
        parser.print_help()
