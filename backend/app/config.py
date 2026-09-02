import secrets

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///./wardrobe.db"
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    frontend_origin: str = "http://localhost:5173"
    upload_dir: str = "./uploads"
    max_upload_mb: int = 5

    @model_validator(mode="after")
    def _ensure_jwt_secret(self) -> "Settings":
        if not self.jwt_secret:
            self.jwt_secret = secrets.token_hex(32)
        return self


settings = Settings()
