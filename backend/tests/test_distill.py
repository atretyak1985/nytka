from unittest.mock import patch

import pytest

from app.db.models import KnowledgeFile, KnowledgeStatus, Project
from app.llm import distill
from app.llm.chunking import chunk_text


def _text_file(tmp_path, name="src.txt", content="hello"):
    p = tmp_path / name
    p.write_text(content, encoding="utf-8")
    return p


def test_chunk_text_splits_and_overlaps():
    text = "\n".join(f"line {i} " + "x" * 50 for i in range(100))
    chunks = chunk_text(text, max_chars=500, overlap_chars=100)
    assert len(chunks) > 1
    assert all(c.strip() for c in chunks)


def test_chunk_text_empty():
    assert chunk_text("   ") == []


def test_extract_file_text_reads_text(tmp_path):
    p = _text_file(tmp_path, content="glossary content")
    kf = KnowledgeFile(project_id=1, filename="g.txt", path=str(p), kind="text")
    text, warning = distill.extract_file_text(kf)
    assert text == "glossary content"
    assert warning is None


def test_extract_file_text_empty_file_warns(tmp_path):
    p = _text_file(tmp_path, content="")
    kf = KnowledgeFile(project_id=1, filename="empty.txt", path=str(p), kind="text")
    text, warning = distill.extract_file_text(kf)
    assert text == ""
    assert "empty" in warning


def test_extract_file_text_missing_pdf_warns():
    kf = KnowledgeFile(project_id=1, filename="ghost.pdf", path="/no/such.pdf", kind="pdf")
    text, warning = distill.extract_file_text(kf)
    assert text == ""
    assert warning is not None


def test_gather_sources_combines_description_and_files(tmp_path):
    p = _text_file(tmp_path, content="file body")
    project = Project(name="P", ai_context="the description")
    project.knowledge_files = [KnowledgeFile(project_id=1, filename="f.txt", path=str(p), kind="text")]
    source, warnings = distill.gather_sources(project)
    assert "the description" in source
    assert "file body" in source
    assert warnings == []


def test_build_brief_single_chunk_returns_map_output():
    project = Project(name="P", llm_provider="lmstudio")
    with patch.object(distill, "_complete", return_value="BRIEF") as mock_complete:
        brief = distill.build_brief(project, "short source text")
    assert brief == "BRIEF"
    assert mock_complete.call_count == 1  # no reduce for a single chunk


def test_build_brief_multi_chunk_runs_reduce():
    project = Project(name="P", llm_provider="lmstudio")
    long_text = "\n".join("x" * 200 for _ in range(200))  # forces multiple chunks
    calls = []

    def fake_complete(proj, system, user, max_tokens):
        calls.append(system)
        return "partial" if "merging" not in system else "MERGED"

    with patch.object(distill, "_complete", side_effect=fake_complete):
        brief = distill.build_brief(project, long_text)
    assert brief == "MERGED"
    assert len(calls) > 2  # several maps + one reduce


def test_distill_persists_brief_and_status(db_session):
    project = db_session.get(Project, 1)
    project.ai_context = "some real description"
    db_session.commit()
    with patch.object(distill, "_complete", return_value="THE BRIEF"):
        distill.distill_project_knowledge(db_session, project)
    assert project.knowledge_brief == "THE BRIEF"
    assert project.knowledge_status == KnowledgeStatus.READY
    assert project.knowledge_generated_at is not None


def test_distill_empty_sources_raises(db_session):
    project = db_session.get(Project, 1)
    project.ai_context = ""
    db_session.commit()
    with pytest.raises(ValueError):
        distill.distill_project_knowledge(db_session, project)


def test_brief_is_truncated_to_budget():
    project = Project(name="P", llm_provider="lmstudio")
    with patch.object(distill, "_complete", return_value="A" * (distill.BRIEF_MAX_CHARS + 500)):
        brief = distill.build_brief(project, "source")
    assert len(brief) <= distill.BRIEF_MAX_CHARS


def test_extract_areas_unions_and_dedups():
    from unittest.mock import MagicMock

    from app.llm.schemas import AreaList

    project = Project(name="P", llm_provider="lmstudio")
    client = MagicMock()
    client.chat.completions.create.return_value = AreaList(
        areas=["[Global]", "[In-mission][Flight Control]", "[Global]"]
    )
    with patch.object(distill, "get_client", return_value=client):
        areas = distill.extract_areas(project, "component map text")
    assert areas == ["[Global]", "[In-mission][Flight Control]"]  # de-duped, order kept


def test_extract_areas_survives_model_error():
    from unittest.mock import MagicMock

    project = Project(name="P", llm_provider="lmstudio")
    client = MagicMock()
    client.chat.completions.create.side_effect = RuntimeError("boom")
    with patch.object(distill, "get_client", return_value=client):
        assert distill.extract_areas(project, "text") == []
