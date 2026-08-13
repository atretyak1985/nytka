# Architecture

Nytka is a local-first monorepo: a FastAPI backend that owns all processing and storage, and a Next.js frontend that talks to it over a typed REST API. Nothing leaves the machine unless the user configures a cloud LLM provider.

## Components

```
┌────────────────────┐        REST (OpenAPI-typed)        ┌─────────────────────┐
│  frontend/          │ ─────────────────────────────────▶ │  backend/            │
│  Next.js 16, React  │ ◀───────────────────────────────── │  FastAPI, Python 3.12│
│  Query, shadcn/ui   │            JSON + polling          │                      │
└────────────────────┘                                     │  ┌────────────────┐  │
                                                           │  │ pipeline        │  │
                                                           │  │ ffmpeg → whisper│  │
                                                           │  │ → LLM extraction│  │
                                                           │  └────────────────┘  │
                                                           │  SQLite (Alembic)    │
                                                           └──────────┬──────────┘
                                                                      │ LiteLLM
                                                        ┌─────────────┴─────────────┐
                                                        │ LM Studio / Ollama (local)│
                                                        │ Anthropic / OpenAI (cloud)│
                                                        └───────────────────────────┘
```

| Layer | Location | Responsibility |
|---|---|---|
| API routers | `backend/app/api/` | REST endpoints: meetings, tasks, projects; Pydantic schemas are the API contract |
| Pipeline | `backend/app/pipeline/` | Audio extraction (FFmpeg CLI), transcription (faster-whisper), status machine, resume/retry |
| LLM layer | `backend/app/llm/` | LiteLLM client, chunking, **BA prompt (versioned product IP)**, structured extraction via Instructor |
| DB | `backend/app/db/` | SQLAlchemy 2 models, Alembic migrations (auto-applied on startup), default-project seed |
| Frontend features | `frontend/src/features/` | meetings (upload/list/detail), tasks (notebook), settings (LLM config) |
| Typed client | `frontend/src/lib/client.ts` | All API calls; types generated from the backend OpenAPI schema (`api-types.ts`) |

## Processing pipeline

Triggered by upload (or retry) as a FastAPI BackgroundTask; each run owns its own DB session.

```
queued → processing → transcribing → extracting → summarizing → done
                                   ↘ error (message stored, Retry available)
```

1. **processing** — FFmpeg (CLI sidecar, atomic `.part` + rename, 10-min timeout) extracts 16 kHz mono wav next to the source media (`<name>.16k.wav`).
2. **transcribing** — faster-whisper (`auto`: large-v3 on CUDA, medium on CPU; override via `NYTKA_WHISPER_MODEL`) with VAD; segments stored with `t_start`/`t_end`; language and duration recorded on the meeting.
3. **extracting** — transcript chunked to ~8 000 chars with ~800-char overlap on segment boundaries; each chunk goes through LiteLLM + Instructor with the BA system prompt (`backend/app/llm/prompts.py`, versioned); results validated against a Pydantic schema with retries; duplicates merged across chunks by normalized title. Tasks are created **only as `draft`**.
4. **summarizing** — the same chunks map-reduce into a structured brief (`backend/app/llm/brief.py`): summary, decisions, risks, open questions, next steps, each point with an optional `source_timestamp` deep-link. A brief failure never fails the meeting — the error lands on the `meeting_briefs` row and the brief can be regenerated from the API without re-transcribing.

**Resume semantics:** retry (only from `error`) re-enters the pipeline and skips completed stages — wav exists → skip FFmpeg; segments exist → skip whisper; tasks exist → skip extraction; brief `ready` → skip summarizing. A failed commit rolls back before the error state is persisted, so a meeting can never get stuck mid-status. On server restart, meetings stranded in active statuses are swept to `error` with a retry hint.

## Data model

```
projects 1──∞ meetings 1──∞ transcript_segments
    │             │ 1──1 meeting_briefs
    └────∞ tasks ∞┘ (meeting_id nullable — manual tasks allowed)
```

- **meeting_briefs** — one row per meeting (`meeting_id` unique): `summary` text plus JSON point lists (`decisions`, `risks`, `open_questions`, `next_steps`, items `{text, source_timestamp|null}`), own `status` lifecycle `empty → processing → ready | error` so a failed brief never blocks a `done` meeting.

- **projects** — carries the LLM config (`llm_provider`, `llm_model`, `llm_base_url`, `llm_api_key`). One default project is seeded; per-project models are the extension point for multi-project support (phase 2).
- **tasks.status** — `draft → approved | rejected`, `approved → done | draft`, `rejected → draft`, `done` terminal. Transitions are enforced server-side (409 otherwise) and mirrored in the UI. The pipeline never creates anything but `draft` — human review is a hard invariant.
- **transcript_segments.speaker** — nullable, reserved for diarization (phase 2).

## Design decisions (deliberate MVP scope)

- No auth — single-user local app.
- SQLite + FastAPI BackgroundTasks — no broker/queue; sufficient for one user, swap points are isolated.
- Frontend polls (2 s) while a meeting is active — no SSE/WebSocket complexity.
- FFmpeg is invoked strictly as a CLI subprocess (LGPL hygiene — no linking).
- API keys live in the local SQLite row, are never returned by the API, and are redacted from error messages.

## Planned extensions

Phase 2: speaker diarization, project CRUD UI, RAG project memory, push of `approved` tasks to Jira via the Atlassian MCP. Phase 3: realtime capture without a bot, PRD/user-story generation, Tauri desktop packaging (the web stack was chosen to make this wrap cheap).
