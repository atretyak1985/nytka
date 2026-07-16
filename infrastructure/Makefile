# Nytka dev tooling. Run from repo root: make -C infrastructure <target>
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/..)

.PHONY: install dev dev-backend dev-frontend test typegen doctor

install:
	cd $(ROOT)/backend && uv sync
	cd $(ROOT)/frontend && npm install

dev:
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	cd $(ROOT)/backend && uv run uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd $(ROOT)/frontend && npm run dev

test:
	cd $(ROOT)/backend && uv run pytest -q
	cd $(ROOT)/frontend && npm run lint && npx tsc --noEmit

typegen:
	cd $(ROOT)/backend && uv run python -c "import json; from app.main import app; print(json.dumps(app.openapi()))" > /tmp/nytka-openapi.json
	cd $(ROOT)/frontend && npx openapi-typescript /tmp/nytka-openapi.json -o src/lib/api-types.ts

doctor:
	@ffmpeg -version >/dev/null 2>&1 && echo "ffmpeg OK" || echo "MISSING: brew install ffmpeg"
	@curl -s http://localhost:1234/v1/models >/dev/null 2>&1 && echo "LM Studio OK" || echo "LM Studio not running on :1234 (optional)"
