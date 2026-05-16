from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # PostgreSQL
    database_url: str = "postgresql://memorytwin:memorytwin_pass@postgres:5432/memorytwin_db"
    postgres_user: str = "memorytwin"
    postgres_password: str = "memorytwin_pass"
    postgres_db: str = "memorytwin_db"
    postgres_host: str = "postgres"
    postgres_port: int = 5432

    # Neo4j
    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "memorytwin_neo4j"

    # Ollama
    ollama_host: str = "http://ollama:11434"
    ollama_model: str = "llama3"
    ollama_connect_timeout: int = 10
    ollama_request_timeout: int = 180
    ollama_health_timeout: int = 90
    ollama_pull_timeout: int = 600
    ollama_max_retries: int = 3
    ollama_retry_base_delay: float = 2.0
    ollama_num_predict: int = 256
    ollama_num_ctx: int = 2048

    # App
    app_env: str = "development"
    frontend_origin: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
