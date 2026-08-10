from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+psycopg://quiz_app:quiz_app_pw@localhost:5432/quiz_platform"

    # JWT
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 720

    # Admin bootstrap
    admin_name: str = "Platform Admin"
    admin_email: str = "admin@quizzz.com"
    admin_password: str = "admin12345"

    # Mistral
    mistral_api_key: str = ""
    mistral_model: str = "mistral-small-latest"

    # CORS
    frontend_origin: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
