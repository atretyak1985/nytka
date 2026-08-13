# Configuration

## Environment variables

Backend settings use the `NYTKA_` prefix (pydantic-settings; also read from `backend/.env`, which is gitignored).

| Variable | Default | Description |
|---|---|---|
| `NYTKA_DATA_DIR` | `<repo>/data` | Where the SQLite DB and uploaded media live. Created automatically. |
| `NYTKA_DATABASE_URL` | `sqlite:///<data_dir>/nytka.db` | Override the DB URL entirely (rarely needed). |
| `NYTKA_WHISPER_MODEL` | `auto` | Whisper model size: `auto` (large-v3 on CUDA, medium on CPU), `tiny`, `medium`, `large-v3`. `tiny` is fast and fine for development; `medium`+ recommended for real Ukrainian meetings. |
| `NYTKA_MAX_UPLOAD_MB` | `2048` | Upload size limit; larger files get 413. |
| `NYTKA_DIARIZATION` | `auto` | Speaker diarization: `auto` runs it when the models are installed, `off` disables it. Missing models are never an error — the step is skipped with an INFO log and segments keep `speaker = null`. CI sets `off`. |
| `NYTKA_DIARIZATION_MODEL_DIR` | `<data_dir>/models/diarization` | Where the diarization ONNX models live (`segmentation.onnx` + `embedding.onnx`). |
| `NYTKA_DIARIZATION_MAX_SPEAKERS` | `8` | Upper bound on distinct speaker labels per meeting, applied by the clusterer itself. Raise it for a large meeting where distinct voices are being merged; a value below the real speaker count merges people, it does not leave segments unlabelled. |

### Speaker diarization (optional)

Diarization runs fully offline via [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) — CPU-only ONNX models fetched by direct URL, no HuggingFace token or gated licences. Install the runtime and models once:

```sh
make -C infrastructure install-diarization
```

This runs `uv sync --extra diarization` and downloads two models (~44 MB total: pyannote segmentation-3.0 ONNX export + 3D-Speaker ERes2Net embeddings) into `NYTKA_DIARIZATION_MODEL_DIR`. It also links the ONNX Runtime shared library into the sherpa-onnx package: the wheels do not bundle it, so `import sherpa_onnx` fails with a `libonnxruntime` load error until it is linked. `make -C infrastructure doctor` reports whether the models are present. After a meeting is processed, map the detected `SPEAKER_NN` labels to team members on the meeting page and re-extract so task assignees use real names.

Frontend: `frontend/.env.local` (gitignored)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL. |

## LLM providers

The LLM used for task extraction is configured **per project** (Settings page or `PATCH /api/projects/{id}`) and routed through LiteLLM:

| Provider | Uses | Notes |
|---|---|---|
| `lmstudio` (default) | `llm_base_url` (default `http://127.0.0.1:1234/v1` — IPv4 on purpose, `localhost` can resolve to `::1`) + `llm_model` | No API key needed. Load an instruct model in LM Studio and start the local server; the Settings UI pins the URL and auto-detects `llm_model` on "Test connection". Structured output uses JSON-schema mode. |
| `ollama` | `llm_base_url` (typically `http://localhost:11434/v1`) + `llm_model` | OpenAI-compatible endpoint; no key. |
| `anthropic` | `llm_api_key` + `llm_model` (e.g. `claude-sonnet-4-6`) | Cloud — transcript text leaves the machine. |
| `openai` | `llm_api_key` + `llm_model` | Cloud — same caveat. |

Use **Test connection** on the Settings page after changing config — it saves the form, probes the server's `/v1/models` endpoint (`POST /api/projects/{id}/llm-connect`), auto-fills the detected model, and reports the exact error on failure. `POST /api/projects/{id}/llm-test` (a 1-token completion round-trip) remains available for end-to-end checks.

### Model recommendations

- **Local:** an 8–14B instruct model (e.g. Qwen-family) extracts tasks reliably, including mixed Ukrainian/English meetings. Smaller models produce noticeably worse extraction.
- **Whisper:** `medium` is the CPU sweet spot for uk/en; `large-v3` if you have a GPU; `tiny` only for development smoke tests.

## LAN access (dev)

You can open the app from another device on your network (e.g. `http://192.168.5.24:3000`):

- The backend dev server listens on `0.0.0.0:8000`; the frontend automatically targets port 8000 **on the host it was opened from**, so no config is needed. Setting `NEXT_PUBLIC_API_URL` overrides this.
- Backend CORS accepts private-range origins (`192.168.*`, `10.*`, `172.16-31.*`) on port 3000.
- Next.js dev resources require the origin to be listed in `allowedDevOrigins` (`frontend/next.config.ts`) — add your machine's LAN IP there if it differs.

## Security & privacy notes

- API keys are stored in the local SQLite database, are never returned by any endpoint, and are redacted from error messages (both `llm-test` and pipeline errors).
- With local providers (LM Studio/Ollama) and local whisper, no meeting content ever leaves the machine — internet is only needed for the first whisper model download.
- Uploaded media and the extracted `.wav` artifacts stay in `data/media/` (kept for pipeline resume; clean up manually if disk space matters).
