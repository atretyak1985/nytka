# Development Guide

## Prerequisites

- **uv** (Python package manager) — backend uses Python 3.12
- **Node.js ≥ 20** — frontend
- **ffmpeg** on PATH — `brew install ffmpeg`
- **LM Studio** (default LLM) serving an OpenAI-compatible API on `localhost:1234` with an instruct model loaded (8–14B works well), or any other provider configured in Settings

## Everyday commands

All tooling lives in `infrastructure/Makefile` and is run from the repo root:

```bash
make -C infrastructure install   # uv sync + npm install
make -C infrastructure dev       # backend :8000 and frontend :3000 in parallel
make -C infrastructure test      # pytest + eslint + tsc --noEmit
make -C infrastructure typegen   # backend OpenAPI → frontend/src/lib/api-types.ts
make -C infrastructure doctor    # checks ffmpeg and LM Studio availability
```

Individual services: `dev-backend` / `dev-frontend`.

## Project layout

```
infrastructure/    Makefile (all dev tooling; future: docker-compose, CI configs)
backend/
  app/api/         REST routers + Pydantic schemas (the API contract)
  app/pipeline/    ffmpeg audio extraction, whisper transcription, status runner
  app/llm/         LiteLLM client, chunking, BA prompts (versioned), extraction
  app/db/          SQLAlchemy models, session, seed; alembic/ migrations
  app/core/        settings (pydantic-settings, NYTKA_* env prefix)
  tests/           pytest suite (hermetic: temp data dir, in-memory DB fixtures)
frontend/
  src/app/         routes: /meetings, /meetings/[id], /tasks, /settings
  src/features/    feature modules: meetings/, tasks/, settings/ (hooks + components)
  src/lib/         api.ts (fetch helper), client.ts (typed API), api-types.ts (generated)
  src/components/  AppNav + shadcn/ui primitives
docs/              this documentation
data/              SQLite DB + uploaded media (gitignored, auto-created)
```

## Workflow rules

- **API contract is the source of truth.** After changing any backend schema/endpoint, run `make -C infrastructure typegen` and commit the regenerated `api-types.ts`. Frontend code must use generated types — never hand-write response shapes.
- **DB changes go through Alembic.** `cd backend && uv run alembic revision --autogenerate -m "..."`. Migrations apply automatically on backend startup — no manual `upgrade` step for users.
- **TDD.** Backend features land with pytest coverage; the suite must stay green (`make -C infrastructure test`).
- **Conventional commits** on `main` (trunk-based): `feat(backend): ...`, `fix(frontend): ...`, `chore: ...`.
- **The draft invariant is untouchable:** no code path may create a task with a status other than `draft` without an explicit user action.
- **BA prompts** live only in `backend/app/llm/prompts.py` and are versioned (`PROMPT_VERSION`). Never inline prompt text elsewhere.

## Testing notes

- `backend/tests/conftest.py` points `NYTKA_DATA_DIR` at a temp dir before app import, so app startup (migrations, seed, media dir) never touches your real `data/`.
- API tests use an in-memory SQLite via the `client`/`db_session` fixtures (dependency override on `get_db`).
- `tests/test_pipeline.py` downloads the whisper `tiny` model (~75 MB) on first run — needs network once.
- LLM calls are always mocked in tests; the real integration is exercised manually (see e2e flow below).

## Manual e2e check

1. `make -C infrastructure doctor` — both checks green.
2. `make -C infrastructure dev`, open `http://localhost:3000`.
3. Drop a short audio file (or synthesize one: `say -v Lesya "Іван зробить логін-форму до п'ятниці" -o /tmp/m.aiff && ffmpeg -i /tmp/m.aiff /tmp/m.mp3`).
4. Watch statuses advance to `done`; open the meeting — transcript left, tasks right; click a task to jump to its transcript moment.
5. `/tasks`: edit inline, approve → done; confirm illegal moves aren't offered.

Tip: `NYTKA_WHISPER_MODEL=tiny make -C infrastructure dev-backend` keeps transcription fast during development.
