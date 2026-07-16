import logging

logger = logging.getLogger(__name__)


def run_pipeline(meeting_id: int) -> None:
    """Full pipeline: ffmpeg -> whisper -> LLM extraction. Implemented in steps 04-05."""
    logger.info("pipeline stub called for meeting %s", meeting_id)
