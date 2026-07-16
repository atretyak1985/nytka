from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config as AlembicConfig
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.meetings import router as meetings_router
from app.api.projects import router as projects_router
from app.api.tasks import router as tasks_router
from app.core.config import settings
from app.db.seed import ensure_default_project
from app.db.session import SessionLocal
from app.pipeline.runner import sweep_interrupted


def run_migrations() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    cfg = AlembicConfig(str(backend_dir / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    command.upgrade(cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    run_migrations()
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    with SessionLocal() as db:
        ensure_default_project(db)
        sweep_interrupted(db)
    yield


app = FastAPI(title="Nytka API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # Local-first app: accept the frontend from localhost or private LAN ranges on any
    # port (Next.js auto-increments the dev port when 3000 is busy).
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings_router)
app.include_router(tasks_router)
app.include_router(projects_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
