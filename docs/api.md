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

Upload validation: extension must be one of `.mp4 .mov .mkv .webm .mp3 .wav .m4a .ogg` (else **422**); size limit 2 GB (else **413**, partial file removed).

Meeting `status`: `queued | processing | transcribing | extracting | done | error`. On `error`, `error_message` is populated.

`MeetingDetailOut.segments[]`: `{id, t_start, t_end, text, speaker|null}` ordered by `t_start`.

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

## Error shape

FastAPI default: `{"detail": "<message>"}` with the appropriate HTTP status (404, 409, 413, 422). Pipeline failures don't surface as API errors — they land in the meeting's `status=error` + `error_message`, visible in the UI with a Retry button.
