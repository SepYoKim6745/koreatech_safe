from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # VLM 서버 설정
    VLM_BASE_URL: str = "http://127.0.0.1:8000/v1"
    VLM_API_KEY: str = "EMPTY"
    VLM_MODEL: str = "qwen2.5-vl-7b"
    VLM_TEMPERATURE: float = 0.2

    # API 서버 설정
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8080
    API_TITLE: str = "VLM Chatbot API"
    API_VERSION: str = "1.0.0"

    # CORS 설정
    CORS_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # 파일 업로드 설정
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

    class Config:
        env_file = ".env"


settings = Settings()
