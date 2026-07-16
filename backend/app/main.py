from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Nytka API", version="0.1.0", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
