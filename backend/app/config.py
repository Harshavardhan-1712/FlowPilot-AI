from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FlowPilot AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database: Supports PostgreSQL (with pgvector) and SQLite fallback
    DATABASE_URL: str = "sqlite:///./flowpilot.db"
    
    # Task Queue / Cache
    REDIS_URL: str = "redis://localhost:6379/0"
    USE_IN_PROCESS_TASKS: bool = True  # Fallback to async in-process task runner if Redis unavailable

    # Security & Auth
    SECRET_KEY: str = "flowpilot-enterprise-insecure-default-key-change-in-prod-xyz987"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # AI Model Providers
    LLM_PROVIDER: str = "mock"  # "mock", "openai", "gemini", "anthropic"
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    DEFAULT_MODEL_NAME: str = "gpt-4o-mini"

    # RAG / Embedding Settings
    EMBEDDING_DIMENSION: int = 384
    MAX_DOCUMENT_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    # SSRF Protection: Allowed domains if specified, or blocked CIDRs
    BLOCKED_IP_RANGES: List[str] = [
        "127.0.0.0/8",
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "169.254.0.0/16",
        "::1/128",
        "fc00::/7",
        "fe80::/10"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


settings = Settings()
