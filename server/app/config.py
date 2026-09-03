"""Application settings, read from environment variables with sane defaults
for local/dev use (this is a hackathon project — no secrets management)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/twizere"


settings = Settings()
