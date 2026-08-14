"""Project memory: full-text search and grounded Q&A over a project's meetings."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas import AskCitationOut, AskIn, AskOut, SearchHitOut, SearchOut
from app.db.fts import search_project
from app.db.models import Meeting, Project
from app.db.session import get_db
from app.llm.qa import answer_question

router = APIRouter(prefix="/api/projects", tags=["memory"])

SEARCH_MAX_LIMIT = 100


def _get_project(db: Session, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    return project


@router.get("/{project_id}/search", response_model=SearchOut)
def search(project_id: int, q: str, limit: int = 30, db: Session = Depends(get_db)) -> SearchOut:
    """Ranked hits across this project's transcripts, tasks and briefs.

    A blank or punctuation-only `q` is an empty result, not a 422: the frontend types
    into this endpoint character by character.
    """
    _get_project(db, project_id)
    limit = max(1, min(limit, SEARCH_MAX_LIMIT))
    hits = search_project(db, project_id, q, limit=limit)

    meeting_ids = {h["meeting_id"] for h in hits if h["meeting_id"] is not None}
    titles = {
        m.id: m.title for m in db.scalars(select(Meeting).where(Meeting.id.in_(meeting_ids)))
    }
    return SearchOut(
        query=q,
        hits=[
            SearchHitOut(
                kind=h["kind"],
                meeting_id=h["meeting_id"],
                meeting_title=titles.get(h["meeting_id"]),
                task_id=h["ref_id"] if h["kind"] == "task" else None,
                t_start=h["t_start"],
                snippet=h["snippet"],
            )
            for h in hits
        ],
    )


@router.post("/{project_id}/ask", response_model=AskOut)
def ask(project_id: int, payload: AskIn, db: Session = Depends(get_db)) -> AskOut:
    """Answer a free-form question from this project's meetings, with citations.

    Synchronous on purpose: this is an interactive action against a local model, so the
    frontend shows a spinner instead of polling a job.
    """
    project = _get_project(db, project_id)
    question = payload.question.strip()
    if not question:
        raise HTTPException(422, "Question must not be empty")
    try:
        result = answer_question(db, project, question)
    except Exception as exc:  # noqa: BLE001 - one failure boundary; the key must never leak
        msg = str(exc)[:2000]
        if project.llm_api_key:
            msg = msg.replace(project.llm_api_key, "[REDACTED]")
        raise HTTPException(502, f"LLM request failed: {msg}") from exc
    return AskOut(
        answer=result["answer"],
        no_data=result["no_data"],
        citations=[AskCitationOut(**c) for c in result["citations"]],
    )
