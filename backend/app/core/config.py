from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # parents[3]: config.py -> core -> app -> backend -> repo root
    data_dir: Path = Path(__file__).resolve().parents[3] / "data"
    database_url: str = ""
    whisper_model: str = "auto"  # auto | tiny | medium | large-v3
    max_upload_mb: int = 2048

    model_config = {"env_prefix": "NYTKA_", "env_file": ".env"}

    @property
    def media_dir(self) -> Path:
        return self.data_dir / "media"

    @property
    def knowledge_dir(self) -> Path:
        return self.data_dir / "knowledge"

    @property
    def screenshots_dir(self) -> Path:
        return self.data_dir / "screenshots"

    @property
    def db_url(self) -> str:
        return self.database_url or f"sqlite:///{self.data_dir / 'nytka.db'}"


settings = Settings()
