from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.meetings import router as meetings_router
from app.api.projects import router as projects_router
from app.api.tasks import router as tasks_router
from app.core.config import settings
from app.db.seed import ensure_default_project
from app.db.session import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    with SessionLocal() as db:
        ensure_default_project(db)
    yield


app = FastAPI(title="Nytka API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings_router)
app.include_router(tasks_router)
app.include_router(projects_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
