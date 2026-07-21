from urllib.parse import urlsplit

import instructor
import litellm

from app.db.models import Project


def normalize_base_url(base_url: str | None) -> str | None:
    """Normalize a user-entered OpenAI-compatible base URL.

    Local servers (LM Studio, Ollama) commonly get pasted without their ``/v1``
    suffix -- e.g. LM Studio's UI displays just ``http://127.0.0.1:1234``. litellm
    then hits the wrong endpoint and raises a ``BadRequestError`` with an empty
    message. Only append ``/v1`` when the URL has no path (or just ``/``); a URL
    with an explicit path (``/v1``, ``/openai/v1``, etc.) is left untouched so we
    never override a deliberate choice.
    """
    if not base_url:
        return base_url
    base = base_url.strip().rstrip("/")
    if urlsplit(base).path:
        return base
    return f"{base}/v1"


def model_and_kwargs(project: Project) -> tuple[str, dict]:
    """Map a project's LLM config to litellm arguments."""
    provider = project.llm_provider
    if provider in ("lmstudio", "ollama"):
        return f"openai/{project.llm_model}", {
            "api_base": normalize_base_url(project.llm_base_url),
            "api_key": project.llm_api_key or "not-needed",
        }
    return f"{provider}/{project.llm_model}", {"api_key": project.llm_api_key}


def get_client(provider: str | None = None) -> instructor.Instructor:
    """Create an Instructor client.

    Local OpenAI-compatible servers (LM Studio, Ollama) reject the object-typed
    ``tool_choice`` that instructor's default TOOLS mode sends, and LM Studio only
    accepts ``response_format.type`` of ``json_schema``/``text``, so use JSON_SCHEMA.
    """
    mode = instructor.Mode.JSON_SCHEMA if provider in ("lmstudio", "ollama") else instructor.Mode.TOOLS
    return instructor.from_litellm(litellm.completion, mode=mode)
