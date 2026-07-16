import logging
from functools import lru_cache
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Meeting, TranscriptSegment

logger = logging.getLogger(__name__)


def pick_model_size(configured: str) -> str:
    if configured != "auto":
        return configured
    try:
        import ctranslate2

        if ctranslate2.get_cuda_device_count() > 0:
            return "large-v3"
    except Exception:  # noqa: BLE001 - any probe failure means no CUDA
        pass
    return "medium"


@lru_cache(maxsize=1)
def get_model(size: str):
    from faster_whisper import WhisperModel

    logger.info("loading whisper model %s", size)
    return WhisperModel(size, compute_type="auto")


def transcribe_meeting(db: Session, meeting: Meeting, wav_path: Path) -> None:
    model = get_model(pick_model_size(settings.whisper_model))
    segments, info = model.transcribe(str(wav_path), vad_filter=True)
    meeting.language = info.language
    meeting.duration_sec = info.duration
    for seg in segments:
        db.add(TranscriptSegment(meeting_id=meeting.id, t_start=seg.start, t_end=seg.end, text=seg.text.strip()))
    db.commit()
