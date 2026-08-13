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


class SpokenSeg(Seg):
    def __init__(self, t_start: float, text: str, speaker: str | None):
        super().__init__(t_start, text)
        self.speaker = speaker


def test_speaker_lines_use_mapped_name_then_raw_label() -> None:
    segs = [
        SpokenSeg(0, "беру логін", "SPEAKER_00"),
        SpokenSeg(5, "окей", "SPEAKER_01"),  # unmapped — raw label shown
        SpokenSeg(10, "без спікера", None),
    ]
    chunks = build_chunks(segs, speaker_names={"SPEAKER_00": "Олена"})
    assert "[00:00] Олена: беру логін" in chunks[0]
    assert "[00:05] SPEAKER_01: окей" in chunks[0]
    assert "[00:10] без спікера" in chunks[0]


def test_no_speakers_output_identical_to_plain_call() -> None:
    # Backward compatibility: segments without speakers must produce byte-identical
    # output whether or not a mapping is supplied.
    segs = [Seg(0, "hello"), Seg(5, "world")]
    spoken = [SpokenSeg(0, "hello", None), SpokenSeg(5, "world", None)]
    assert build_chunks(segs) == build_chunks(spoken, speaker_names={"SPEAKER_00": "Олена"})
    assert build_chunks(segs)[0] == "[00:00] hello\n[00:05] world"
