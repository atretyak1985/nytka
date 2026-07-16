import instructor
import litellm

from app.db.models import Project


def model_and_kwargs(project: Project) -> tuple[str, dict]:
    """Map a project's LLM config to litellm arguments."""
    provider = project.llm_provider
    if provider in ("lmstudio", "ollama"):
        return f"openai/{project.llm_model}", {
            "api_base": project.llm_base_url,
            "api_key": project.llm_api_key or "not-needed",
        }
    return f"{provider}/{project.llm_model}", {"api_key": project.llm_api_key}


def get_client() -> instructor.Instructor:
    return instructor.from_litellm(litellm.completion)
