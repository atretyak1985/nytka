"""Knowledge-base distillation ("Init").

Reads a project's editable description (ai_context) plus its uploaded reference files,
and condenses them into a compact DOMAIN BACKGROUND brief stored on Project.knowledge_brief.
That brief — not the raw sources — is what extraction injects, keeping the per-fragment
prompt small and free of interactive-agent playbook noise.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.db.models import KnowledgeFile, KnowledgeStatus, Project
from app.db.session import SessionLocal
from app.llm.chunking import chunk_text
from app.llm.client import get_client, model_and_kwargs
from app.llm.prompts import DISTILL_AREAS_PROMPT, DISTILL_REDUCE_PROMPT, DISTILL_SYSTEM_PROMPT
from app.llm.schemas import AreaList

logger = logging.getLogger(__name__)

# Hard char cap on the stored brief — a safety net so a misbehaving model can never
# reintroduce the context bloat this feature exists to prevent.
BRIEF_MAX_CHARS = 8000
MAP_MAX_TOKENS = 900
REDUCE_MAX_TOKENS = 1200


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def extract_file_text(kf: KnowledgeFile) -> tuple[str, str | None]:
    """Return (text, warning). Warning is set (text may be empty) when a file yields nothing."""
    try:
        if kf.kind == "pdf":
            reader = PdfReader(kf.path)
            text = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
            if not text:
                return "", f"{kf.filename}: no extractable text (scanned image PDF?)"
            return text, None
        # text kind (.md / .txt)
        with open(kf.path, "rb") as fh:
            raw = fh.read()
        text = raw.decode("utf-8", errors="replace").strip()
        if not text:
            return "", f"{kf.filename}: file is empty"
        return text, None
    except Exception as exc:  # noqa: BLE001 - one bad file must not fail the whole job
        logger.exception("failed to read knowledge file %s", kf.id)
        return "", f"{kf.filename}: could not read ({exc})"


def gather_sources(project: Project) -> tuple[str, list[str]]:
    """Combine ai_context + all file texts into one document; collect per-file warnings."""
    parts: list[str] = []
    warnings: list[str] = []
    if project.ai_context.strip():
        parts.append("# Project description\n" + project.ai_context.strip())
    for kf in project.knowledge_files:
        text, warning = extract_file_text(kf)
        if warning:
            warnings.append(warning)
        if text:
            parts.append(f"# File: {kf.filename}\n{text}")
    return "\n\n".join(parts), warnings


def _complete(project: Project, system: str, user: str, max_tokens: int) -> str:
    model, kwargs = model_and_kwargs(project)
    client = get_client(project.llm_provider)
    resp = client.chat.completions.create(
        model=model,
        response_model=None,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=max_tokens,
        **kwargs,
    )
    return (resp.choices[0].message.content or "").strip()


def build_brief(project: Project, source_text: str) -> str:
    """Map-reduce the combined source text into one compact brief."""
    chunks = chunk_text(source_text)
    if not chunks:
        return ""
    partials = [
        _complete(project, DISTILL_SYSTEM_PROMPT, chunk, MAP_MAX_TOKENS)
        for chunk in chunks
    ]
    partials = [p for p in partials if p]
    if not partials:
        return ""
    if len(partials) == 1:
        brief = partials[0]
    else:
        merged_input = "\n\n---\n\n".join(
            f"Partial brief {i + 1}:\n{p}" for i, p in enumerate(partials)
        )
        brief = _complete(project, DISTILL_REDUCE_PROMPT, merged_input, REDUCE_MAX_TOKENS)
    return brief[:BRIEF_MAX_CHARS].strip()


def extract_areas(project: Project, source_text: str) -> list[str]:
    """Pull the "[Area][Sub-area]" taxonomy from the sources (Feature B).

    Structured extraction per chunk, unioned in code (order-preserving). Best-effort:
    any failure yields [] so it never blocks the brief.
    """
    model, kwargs = model_and_kwargs(project)
    client = get_client(project.llm_provider)
    seen: dict[str, None] = {}
    for chunk in chunk_text(source_text):
        try:
            result: AreaList = client.chat.completions.create(
                model=model,
                response_model=AreaList,
                max_retries=1,
                messages=[
                    {"role": "system", "content": DISTILL_AREAS_PROMPT},
                    {"role": "user", "content": chunk},
                ],
                **kwargs,
            )
        except Exception:  # noqa: BLE001 - areas are optional; never fail the job
            logger.exception("area extraction failed for project %s", project.id)
            continue
        for area in result.areas:
            cleaned = area.strip()
            if cleaned:
                seen.setdefault(cleaned, None)
    return list(seen)


def distill_project_knowledge(db: Session, project: Project) -> None:
    """Generate and persist the knowledge brief for a project (raises on failure)."""
    source_text, warnings = gather_sources(project)
    if not source_text.strip():
        detail = "; ".join(warnings) if warnings else "no description or readable files"
        raise ValueError(f"Nothing to distill: {detail}")

    brief = build_brief(project, source_text)
    if not brief:
        raise ValueError("Model returned an empty brief")

    project.knowledge_brief = brief
    project.task_areas = extract_areas(project, source_text)
    project.knowledge_generated_at = now_utc()
    project.knowledge_error = "; ".join(warnings) if warnings else None
    project.knowledge_status = KnowledgeStatus.READY
    db.commit()
    logger.info(
        "distilled knowledge brief for project %s (%d chars, %d areas)",
        project.id, len(brief), len(project.task_areas),
    )


def run_distill(project_id: int) -> None:
    """BackgroundTasks entry point: owns its DB session and failure boundary."""
    with SessionLocal() as db:
        project = db.get(Project, project_id)
        if project is None:
            logger.error("distill: project %s not found", project_id)
            return
        try:
            distill_project_knowledge(db, project)
        except Exception as exc:  # noqa: BLE001 - single failure boundary for the background job
            logger.exception("distill failed for project %s", project_id)
            db.rollback()
            msg = str(exc)[:2000]
            if project.llm_api_key:
                msg = msg.replace(project.llm_api_key, "[REDACTED]")
            project.knowledge_status = KnowledgeStatus.ERROR
            project.knowledge_error = msg
            db.commit()
