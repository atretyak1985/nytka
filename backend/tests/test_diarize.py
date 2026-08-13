from pathlib import Path
from unittest.mock import patch

from app.db.models import Meeting, TranscriptSegment
from app.pipeline.diarize import SpeakerTurn, _cap_speakers, assign_speakers

WAV = Path("/tmp/fake.16k.wav")


def _meeting_with_segments(db) -> Meeting:
    meeting = Meeting(project_id=1, title="m", source_filename="m.mp4", media_path="/x")
    db.add(meeting)
    db.flush()
    db.add_all([
        TranscriptSegment(meeting_id=meeting.id, t_start=0.0, t_end=4.0, text="перший"),
        TranscriptSegment(meeting_id=meeting.id, t_start=4.0, t_end=9.0, text="другий"),
        TranscriptSegment(meeting_id=meeting.id, t_start=60.0, t_end=65.0, text="тиша/музика"),
    ])
    db.commit()
    return meeting


TURNS = [
    SpeakerTurn(start=0.0, end=3.5, label="SPEAKER_00"),
    SpeakerTurn(start=3.5, end=10.0, label="SPEAKER_01"),
]


def _segments(db, meeting):
    return {s.t_start: s for s in db.query(TranscriptSegment).filter_by(meeting_id=meeting.id)}


def test_assign_speakers_labels_by_largest_overlap(db_session, monkeypatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "diarization", "auto")
    meeting = _meeting_with_segments(db_session)
    with (
        patch("app.pipeline.diarize.models_available", return_value=True),
        patch("app.pipeline.diarize.diarize_wav", return_value=TURNS),
    ):
        count = assign_speakers(db_session, meeting, WAV)
    assert count == 2
    by_start = _segments(db_session, meeting)
    assert by_start[0.0].speaker == "SPEAKER_00"  # 3.5s overlap vs 0.5s
    assert by_start[4.0].speaker == "SPEAKER_01"
    assert by_start[60.0].speaker is None  # zero overlap — silence stays unlabelled


def test_assign_speakers_is_idempotent(db_session, monkeypatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "diarization", "auto")
    meeting = _meeting_with_segments(db_session)
    with (
        patch("app.pipeline.diarize.models_available", return_value=True),
        patch("app.pipeline.diarize.diarize_wav", return_value=TURNS),
    ):
        first = assign_speakers(db_session, meeting, WAV)
        second = assign_speakers(db_session, meeting, WAV)
    assert first == second == 2
    by_start = _segments(db_session, meeting)
    assert by_start[0.0].speaker == "SPEAKER_00"
    assert by_start[4.0].speaker == "SPEAKER_01"


def test_assign_speakers_off_skips_without_importing_engine(db_session, monkeypatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "diarization", "off")
    meeting = _meeting_with_segments(db_session)
    with patch("app.pipeline.diarize.diarize_wav") as mock_diarize:
        assert assign_speakers(db_session, meeting, WAV) == 0
    mock_diarize.assert_not_called()
    assert all(s.speaker is None for s in _segments(db_session, meeting).values())


def test_assign_speakers_missing_models_returns_zero(db_session, monkeypatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "diarization", "auto")
    meeting = _meeting_with_segments(db_session)
    with (
        patch("app.pipeline.diarize.models_available", return_value=False),
        patch("app.pipeline.diarize.diarize_wav") as mock_diarize,
    ):
        assert assign_speakers(db_session, meeting, WAV) == 0
    mock_diarize.assert_not_called()  # sherpa_onnx is imported inside diarize_wav — never reached


def test_assign_speakers_swallows_diarization_errors(db_session, monkeypatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "diarization", "auto")
    meeting = _meeting_with_segments(db_session)
    with (
        patch("app.pipeline.diarize.models_available", return_value=True),
        patch("app.pipeline.diarize.diarize_wav", side_effect=RuntimeError("onnx exploded")),
    ):
        assert assign_speakers(db_session, meeting, WAV) == 0  # must not raise
    assert all(s.speaker is None for s in _segments(db_session, meeting).values())


def test_cap_speakers_keeps_most_talkative() -> None:
    turns = [
        SpeakerTurn(start=0, end=100, label="SPEAKER_00"),
        SpeakerTurn(start=100, end=150, label="SPEAKER_01"),
        SpeakerTurn(start=150, end=151, label="SPEAKER_02"),  # 1s blip — dropped at cap 2
    ]
    capped = _cap_speakers(turns, max_speakers=2)
    assert {t.label for t in capped} == {"SPEAKER_00", "SPEAKER_01"}
    assert _cap_speakers(turns, max_speakers=8) == turns


def _fake_packages(tmp_path: Path, lib_name: str) -> tuple[Path, Path]:
    """Minimal on-disk stand-ins for the sherpa_onnx and onnxruntime packages."""
    sherpa_lib = tmp_path / "sherpa_onnx" / "lib"
    sherpa_lib.mkdir(parents=True)
    ort_capi = tmp_path / "onnxruntime" / "capi"
    ort_capi.mkdir(parents=True)
    (ort_capi / lib_name).write_bytes(b"\x00")
    return sherpa_lib, ort_capi


def _patch_find_spec(monkeypatch, tmp_path: Path) -> None:
    """find_spec must not execute the packages — mirror that with plain specs."""
    import importlib.util
    from types import SimpleNamespace

    def fake_find_spec(name):
        return SimpleNamespace(submodule_search_locations=[str(tmp_path / name)])

    monkeypatch.setattr(importlib.util, "find_spec", fake_find_spec)


def test_link_onnxruntime_creates_and_reuses_link(tmp_path, monkeypatch) -> None:
    """The wheels do not bundle libonnxruntime, so importing sherpa_onnx dies until
    the installer links it in — the repair must work without importing either package."""
    from app.pipeline.diarize import link_onnxruntime

    sherpa_lib, ort_capi = _fake_packages(tmp_path, "libonnxruntime.1.27.0.dylib")
    _patch_find_spec(monkeypatch, tmp_path)

    result = link_onnxruntime()
    link = sherpa_lib / "libonnxruntime.dylib"
    assert "linked" in result
    assert link.is_symlink()
    assert link.resolve() == (ort_capi / "libonnxruntime.1.27.0.dylib").resolve()

    assert "already linked" in link_onnxruntime()  # idempotent: no exception, no relink


def test_link_onnxruntime_reports_missing_package(tmp_path, monkeypatch) -> None:
    import importlib.util

    monkeypatch.setattr(importlib.util, "find_spec", lambda name: None)
    from app.pipeline.diarize import link_onnxruntime

    assert "not installed" in link_onnxruntime()
