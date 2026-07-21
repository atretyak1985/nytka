from app.db.models import Project
from app.llm.client import model_and_kwargs, normalize_base_url


def test_normalize_base_url_appends_v1_when_no_path():
    assert normalize_base_url("http://127.0.0.1:1234") == "http://127.0.0.1:1234/v1"


def test_normalize_base_url_appends_v1_when_root_path_only():
    assert normalize_base_url("http://127.0.0.1:1234/") == "http://127.0.0.1:1234/v1"


def test_normalize_base_url_leaves_explicit_v1_untouched():
    assert normalize_base_url("http://127.0.0.1:1234/v1") == "http://127.0.0.1:1234/v1"


def test_normalize_base_url_leaves_other_explicit_path_untouched():
    assert normalize_base_url("http://127.0.0.1:1234/openai/v1") == "http://127.0.0.1:1234/openai/v1"


def test_normalize_base_url_strips_trailing_slash_on_explicit_path():
    assert normalize_base_url("http://127.0.0.1:1234/v1/") == "http://127.0.0.1:1234/v1"


def test_normalize_base_url_strips_surrounding_whitespace():
    assert normalize_base_url("  http://127.0.0.1:1234  ") == "http://127.0.0.1:1234/v1"


def test_normalize_base_url_passes_through_none_and_empty():
    assert normalize_base_url(None) is None
    assert normalize_base_url("") == ""


def test_model_and_kwargs_normalizes_lmstudio_base_url():
    project = Project(name="P", llm_provider="lmstudio", llm_model="local-model", llm_base_url="http://127.0.0.1:1234")
    model, kwargs = model_and_kwargs(project)
    assert model == "openai/local-model"
    assert kwargs["api_base"] == "http://127.0.0.1:1234/v1"


def test_model_and_kwargs_does_not_touch_hosted_provider_url():
    project = Project(name="P", llm_provider="openai", llm_model="gpt-4o", llm_api_key="sk-x")
    model, kwargs = model_and_kwargs(project)
    assert model == "openai/gpt-4o"
    assert "api_base" not in kwargs
