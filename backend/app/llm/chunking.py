import logging
from collections.abc import Sequence

logger = logging.getLogger(__name__)


def format_timestamp(seconds: float) -> str:
    total = int(seconds)
    return f"{total // 60:02d}:{total % 60:02d}"


def chunk_text(text: str, max_chars: int = 8000, overlap_chars: int = 400) -> list[str]:
    """Split free-form text into overlapping chunks on line boundaries.

    Used for knowledge-base distillation (plain document text), unlike build_chunks
    which joins timestamped transcript segments.
    """
    if overlap_chars >= max_chars:
        raise ValueError(f"overlap_chars ({overlap_chars}) must be less than max_chars ({max_chars})")
    text = text.strip()
    if not text:
        return []
    lines = text.split("\n")
    chunks: list[str] = []
    current: list[str] = []
    size = 0
    for line in lines:
        if current and size + len(line) > max_chars:
            chunks.append("\n".join(current))
            tail: list[str] = []
            tail_size = 0
            for prev in reversed(current):
                if tail_size + len(prev) > overlap_chars:
                    break
                tail.insert(0, prev)
                tail_size += len(prev)
            current = tail
            size = tail_size
        current.append(line)
        size += len(line) + 1
    if current:
        chunks.append("\n".join(current))
    return chunks


def build_chunks(segments: Sequence, max_chars: int = 8000, overlap_chars: int = 800) -> list[str]:
    """Join segments as '[mm:ss] text' lines; split on segment boundaries with tail overlap."""
    if overlap_chars >= max_chars:
        raise ValueError(f"overlap_chars ({overlap_chars}) must be less than max_chars ({max_chars})")
    lines = [f"[{format_timestamp(s.t_start)}] {s.text}" for s in segments if s.text.strip()]
    for line in lines:
        if len(line) > max_chars:
            logger.warning("transcript line exceeds max_chars (%d > %d); chunk will oversize", len(line), max_chars)
    if not lines:
        return []
    chunks: list[str] = []
    current: list[str] = []
    size = 0
    for line in lines:
        if current and size + len(line) > max_chars:
            chunks.append("\n".join(current))
            # carry tail lines into next chunk as overlap
            tail: list[str] = []
            tail_size = 0
            for prev in reversed(current):
                if tail_size + len(prev) > overlap_chars:
                    break
                tail.insert(0, prev)
                tail_size += len(prev)
            current = tail
            size = tail_size
        current.append(line)
        size += len(line)
    chunks.append("\n".join(current))
    return chunks
