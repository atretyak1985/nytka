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
| Frontend features | `frontend/src/features/` | meetings (upload/list/detail), tasks (notebook), memory (search + Q&A), settings (LLM config) |
| Typed client | `frontend/src/lib/client.ts` | All API calls; types generated from the backend OpenAPI schema (`api-types.ts`) |

## Processing pipeline

Triggered by upload (or retry) as a FastAPI BackgroundTask; each run owns its own DB session.

```
queued → processing → transcribing → extracting → summarizing → done
                                   ↘ error (message stored, Retry available)
```

1. **processing** — FFmpeg (CLI sidecar, atomic `.part` + rename, 10-min timeout) extracts 16 kHz mono wav next to the source media (`<name>.16k.wav`).
2. **transcribing** — faster-whisper (`auto`: large-v3 on CUDA, medium on CPU; override via `NYTKA_WHISPER_MODEL`) with VAD; segments stored with `t_start`/`t_end`; language and duration recorded on the meeting. At the end of this step, **speaker diarization** (sherpa-onnx over the same 16 kHz wav, `backend/app/pipeline/diarize.py`) labels each segment with the `SPEAKER_NN` turn holding the largest time overlap. Best-effort like screenshot capture: with `NYTKA_DIARIZATION=off` or missing models it is skipped (INFO log) and can never error the meeting. The user maps labels to `Project.team` names per meeting (`Meeting.speaker_labels`, `PATCH /api/meetings/{id}`).
3. **extracting** — transcript chunked to ~8 000 chars with ~800-char overlap on segment boundaries, lines formatted as `[mm:ss] Name: text` when speakers are known (mapped team name, else the raw label); each chunk goes through LiteLLM + Instructor with the BA system prompt (`backend/app/llm/prompts.py`, versioned); results validated against a Pydantic schema with retries; duplicates merged across chunks by normalized title. The assignee is the person who took the work on themselves in the dialogue (or was explicitly delegated it) — not whoever's name was mentioned nearby. Tasks are created **only as `draft`**.
4. **summarizing** — the same chunks map-reduce into a structured brief (`backend/app/llm/brief.py`): summary, decisions, risks, open questions, next steps, each point with an optional `source_timestamp` deep-link. A brief failure never fails the meeting — the error lands on the `meeting_briefs` row and the brief can be regenerated from the API without re-transcribing.

5. **duplicate flagging** (no status of its own) — after the brief and before screenshot capture, `backend/app/llm/dedup.py` asks the project's LLM whether each fresh draft repeats work the project already tracks. Candidates come from the FTS index, scoped to *other* meetings (the exclusion is pushed into the query: the draft is itself indexed, and a self-hit would satisfy the AND pass and starve the OR fallback). The result is only ever a **flag** (`tasks.duplicate_of_task_id` + `duplicate_reason`) — merging is an explicit user action, never automatic. Best-effort like screenshots: it never errors a finished meeting.

**Resume semantics:** retry (only from `error`) re-enters the pipeline and skips completed stages — wav exists → skip FFmpeg; segments exist → skip whisper; tasks exist → skip extraction; brief `ready` → skip summarizing; `tasks.dedup_checked_at` set → skip that draft's dedup call. A draft whose dedup call *failed* is deliberately left unstamped so a retry picks it up again. A failed commit rolls back before the error state is persisted, so a meeting can never get stuck mid-status. On server restart, meetings stranded in active statuses are swept to `error` with a retry hint.

## Data model

```
projects 1──∞ meetings 1──∞ transcript_segments
    │             │ 1──1 meeting_briefs
    └────∞ tasks ∞┘ (meeting_id nullable — manual tasks allowed)

search_index (FTS5, standalone) ← segments + tasks (triggers), briefs (app code)
```

- **meeting_briefs** — one row per meeting (`meeting_id` unique): `summary` text plus JSON point lists (`decisions`, `risks`, `open_questions`, `next_steps`, items `{text, source_timestamp|null}`), own `status` lifecycle `empty → processing → ready | error` so a failed brief never blocks a `done` meeting.

- **projects** — carries the LLM config (`llm_provider`, `llm_model`, `llm_base_url`, `llm_api_key`). One default project is seeded; per-project models are the extension point for multi-project support (phase 2).
- **tasks.status** — `draft → approved | rejected`, `approved → done | draft`, `rejected → draft`, `done` terminal. Transitions are enforced server-side (409 otherwise) and mirrored in the UI. The pipeline never creates anything but `draft` — human review is a hard invariant.
- **tasks.duplicate_of_task_id / duplicate_reason / dedup_checked_at** — cross-meeting dedup. The first two are a suggestion while the task is a draft and the merge target once it is `merged`; the third is the idempotency stamp that keeps Retry a resume. `merged` is a fifth, terminal status reachable **only** via `POST /api/tasks/{id}/merge`, which comments on the target's Jira ticket before flipping the status — so folded-away work always leaves a trace on the ticket that absorbed it, and no second issue is ever created.
- **transcript_segments.speaker** — nullable raw diarization label (`SPEAKER_NN`); `meetings.speaker_labels` maps labels to team names, confirmed by the user (no auto-guessing).

## Search index (project memory)

A single SQLite **FTS5** virtual table, `search_index`, makes a project's whole meeting history queryable — no embeddings, no vector store, no external service, so the locality guarantee holds. The canonical DDL lives in `backend/app/db/fts.py`; the Alembic migration `a4e9c1d76b83_search_index_fts` carries a frozen copy (migrations must never import application code).

```
search_index(text, kind UNINDEXED, project_id UNINDEXED, meeting_id UNINDEXED,
             ref_id UNINDEXED, t_start UNINDEXED)
             tokenize = 'unicode61 remove_diacritics 2'   -- Ukrainian + English
```

`kind` + `ref_id` identify the source row: `segment` → `transcript_segments.id`, `task` → `tasks.id`, `brief` → `meeting_briefs.id`.

- **Segments and tasks sync via SQL triggers** (7 of them: insert/update/delete per table, plus the brief delete). No application code touches the index for them, so every write path — pipeline INSERTs, `PATCH /api/tasks/{id}`, cascading meeting deletes — stays in sync by construction, including code written later that never heard of the index.
- **Briefs are indexed from application code** (`index_brief`, called from `app/llm/brief.py` when a brief turns `ready`): their content is JSON point lists that a trigger cannot flatten. The upsert is delete-then-insert, so regenerating a brief replaces its row instead of duplicating it. Only the DELETE side is a trigger.
- **Backfill happens once, in the migration** — triggers only fire from their creation onward, so existing segments, tasks and `ready` briefs are inserted by the upgrade (briefs flattened in Python).
- **Query sanitisation** (`fts_query`): user input is reduced to `\w` tokens, lowercased, quoted and prefix-matched, capped at 12 tokens. FTS operators are neutralised by construction rather than blacklisted, so no search string can produce a 500. Search runs AND-semantics first and falls back to OR when that returns nothing (recall for question-shaped input).
- Ranking is `bm25()`; highlighting uses `snippet()` with `\x01`/`\x02` markers instead of HTML (see [api.md](api.md)).

### Q&A flow (`backend/app/llm/qa.py`)

```
question → search_project(kinds=segment+brief, limit 12)
             │
             ├─ no hits → no_data:true, no LLM call at all
             └─ hits → excerpts "[meeting {id} «title» @ mm:ss] text"
                        → LLM (Instructor, response_model=AskResult, max_retries=2)
                        → drop citations whose meeting_id was not in the context
                        → no citations left? force no_data:true
```

Tasks are excluded from retrieval on purpose: they are derived text, and quoting them would let the model cite its own earlier output. The excerpt header is the only place a `meeting_id`/`t_start` can come from, which is what makes post-hoc citation validation possible. The same index serves duplicate-candidate lookup for task dedup.

## Design decisions (deliberate MVP scope)

- No auth — single-user local app.
- SQLite + FastAPI BackgroundTasks — no broker/queue; sufficient for one user, swap points are isolated.
- Frontend polls (2 s) while a meeting is active — no SSE/WebSocket complexity.
- FFmpeg is invoked strictly as a CLI subprocess (LGPL hygiene — no linking).
- API keys live in the local SQLite row, are never returned by the API, and are redacted from error messages.

## Planned extensions

Phase 2: speaker diarization, project CRUD UI, RAG project memory, push of `approved` tasks to Jira via the Atlassian MCP. Phase 3: realtime capture without a bot, PRD/user-story generation, Tauri desktop packaging (the web stack was chosen to make this wrap cheap).
