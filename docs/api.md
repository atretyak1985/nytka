# API Reference

Base URL: `http://localhost:8000`. All responses are JSON. The authoritative, always-current contract is the OpenAPI schema at `/docs` (Swagger UI) or `/openapi.json`; frontend types are generated from it (`make -C infrastructure typegen`).

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | `{"status": "ok"}` |

## Meetings

| Method | Path | Description |
|---|---|---|
| POST | `/api/meetings` | Upload a meeting recording (multipart). Fields: `file` (required), `title` (optional). Returns **201** with the meeting in `queued` status and schedules processing. |
| GET | `/api/meetings` | List meetings, newest first. |
| GET | `/api/meetings/{id}` | Meeting detail: meeting fields + `segments[]` (transcript) + `tasks[]`. **404** if unknown. |
| POST | `/api/meetings/{id}/retry` | Re-run the pipeline. Allowed only from `error` status — otherwise **409**. Resumes from the last completed stage. |
| GET | `/api/meetings/{id}/brief` | Structured minutes (summary, decisions, risks, open questions, next steps). **404** if the meeting is unknown or has no brief yet. |
| POST | `/api/meetings/{id}/brief/regenerate` | Re-run brief generation only (segments and tasks untouched). Marks the brief `processing` and schedules a background job; returns the brief. **409** if the meeting has no transcript yet. |
| GET | `/api/meetings/{id}/brief/markdown` | The brief rendered as `text/markdown` (backs the UI "Copy as Markdown" button). **404** if absent. |

Upload validation: extension must be one of `.mp4 .mov .mkv .webm .mp3 .wav .m4a .ogg` (else **422**); size limit 2 GB (else **413**, partial file removed).

Meeting `status`: `queued | processing | transcribing | extracting | summarizing | done | error`. On `error`, `error_message` is populated.

`MeetingDetailOut.segments[]`: `{id, t_start, t_end, text, speaker|null}` ordered by `t_start`. `MeetingDetailOut.brief` embeds the brief (or `null`).

Brief `status`: `empty | processing | ready | error`. Each point in `decisions/risks/open_questions/next_steps` is `{text, source_timestamp|null}` — `source_timestamp` (seconds) deep-links into the recording. A brief failure never fails the meeting: the error lands on the brief row only.

## Tasks (notebook)

| Method | Path | Description |
|---|---|---|
| POST | `/api/tasks` | Create a manual task: `{project_id, title, description?, assignee?, priority?}`. Always created as `draft`. **404** if project doesn't exist. |
| GET | `/api/tasks` | List tasks, newest first. Filters: `?project_id=&status=&meeting_id=`. |
| PATCH | `/api/tasks/{id}` | Partial update of `title, description, assignee, priority, status`. Explicit `null` for non-nullable fields → **422**. |
| DELETE | `/api/tasks/{id}` | **204**, or **404**. |

Task `status` transitions (server-enforced, illegal → **409**):

```
draft ──▶ approved ──▶ done (terminal)
  │  ▲        │
  ▼  └────────┘  (back to draft)
rejected ──▶ draft
```

`priority`: `low | medium | high`. `source_timestamp` (seconds, nullable) links an extracted task back to the transcript moment it came from.

## Projects

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects` | List projects. `llm_api_key` is **never** included in responses. |
| PATCH | `/api/projects/{id}` | Partial update: `name, llm_provider, llm_model, llm_base_url, llm_api_key`. Explicit `null` for `name/llm_provider/llm_model` → **422**. |
| POST | `/api/projects/{id}/llm-test` | Fires a 1-token test completion with the project's LLM config. Returns `{ok: true}` or `{ok: false, error}` — never raises. API key values are redacted from `error`. |
| POST | `/api/projects/{id}/llm-connect` | Probes the local provider's OpenAI-compatible `GET /v1/models` with a 4s timeout. Returns `{ok, models, model, error}` — never raises; API keys are redacted from `error`. Local providers (`lmstudio`/`ollama`) only. Backs Settings → "Test connection" and auto-detects the loaded model. |

LLM provider mapping (see [configuration](configuration.md)): `lmstudio`/`ollama` use `llm_base_url` (OpenAI-compatible endpoints, no key required); `anthropic`/`openai` use `llm_api_key`.

## Project memory (search & Q&A)

| Method | Path | Description |
|---|---|---|
| GET | `/api/projects/{id}/search` | Full-text search across this project's transcripts, tasks and briefs. Query params: `q` (required), `limit` (default 30, capped at 100). **404** if the project is unknown. |
| POST | `/api/projects/{id}/ask` | `{question}` → an answer grounded in this project's meetings, with citations. Synchronous (no background job). **404** unknown project, **422** blank question, **502** on LLM failure (API keys redacted from the message). |

`SearchOut`: `{query, hits[]}`. Each hit is `{kind, meeting_id|null, meeting_title|null, task_id|null, t_start|null, snippet}` where `kind` is `segment | task | brief`, `task_id` is set only for `task` hits, and `t_start` (seconds) deep-links into the recording via `?seg=`. Results never cross project boundaries.

`snippet` marks matched terms with the control characters `\x01` (start) and `\x02` (end) — deliberately **not** `<mark>`, because a transcript can itself contain HTML and no client should render markup coming out of the database. Split on those two characters and wrap the parts yourself.

A blank or punctuation-only `q` returns `hits: []` with **200** (the UI searches as you type), and FTS operators in the query (`OR`, `"`, `*`, `NEAR`, parentheses) are neutralised rather than rejected — search input can never produce a 500.

`AskOut`: `{answer, no_data, citations[]}`; each citation is `{meeting_id, meeting_title, t_start|null, quote}`. Contract: when nothing relevant is indexed, the LLM is not called at all and the response is `no_data: true` with an empty citation list. Citations pointing at meetings that were not in the retrieved context are dropped server-side, and an answer left without a single valid citation is forced to `no_data: true` — the answer text is never presented as grounded when it isn't.

## Error shape

FastAPI default: `{"detail": "<message>"}` with the appropriate HTTP status (404, 409, 413, 422). Pipeline failures don't surface as API errors — they land in the meeting's `status=error` + `error_message`, visible in the UI with a Retry button.
