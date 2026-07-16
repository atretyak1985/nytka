import pytest

from app.llm.chunking import build_chunks, format_timestamp


class Seg:
    def __init__(self, t_start: float, text: str):
        self.t_start = t_start
        self.t_end = t_start + 5
        self.text = text


def test_format_timestamp() -> None:
    assert format_timestamp(0) == "00:00"
    assert format_timestamp(75.4) == "01:15"
    assert format_timestamp(3671) == "61:11"


def test_single_chunk_when_small() -> None:
    chunks = build_chunks([Seg(0, "hello"), Seg(5, "world")], max_chars=1000, overlap_chars=100)
    assert len(chunks) == 1
    assert "[00:00] hello" in chunks[0] and "[00:05] world" in chunks[0]


def test_splits_with_overlap() -> None:
    segs = [Seg(i * 5, f"segment number {i} " + "x" * 80) for i in range(40)]
    chunks = build_chunks(segs, max_chars=1000, overlap_chars=200)
    assert len(chunks) > 1
    # overlap: tail of chunk N appears in head of chunk N+1
    tail_line = chunks[0].splitlines()[-1]
    assert tail_line in chunks[1]


def test_invalid_overlap_raises() -> None:
    with pytest.raises(ValueError):
        build_chunks([Seg(0, "hello")], max_chars=100, overlap_chars=100)
