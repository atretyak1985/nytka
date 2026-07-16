# Nytka — AI Business Analyst

Local-first web app: upload a meeting video/audio → transcript (uk/en) → LLM-extracted tasks in a built-in notebook.

## Quickstart

Prereqs: uv, node ≥ 20, ffmpeg (`brew install ffmpeg`), LM Studio running on `localhost:1234` (or configure another provider in Settings).

    make install   # backend + frontend deps
    make dev       # backend :8000 + frontend :3000
    make test      # pytest + frontend lint/typecheck
    make typegen   # regenerate frontend API types from OpenAPI
