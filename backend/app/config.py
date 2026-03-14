import secrets
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # VLM 서버 설정
    VLM_BASE_URL: str = "http://127.0.0.1:8000/v1"
    VLM_API_KEY: str = "EMPTY"
    # vLLM의 /v1/models 에서 확인되는 model id 와 동일해야 함
    # VLM_MODEL: str = "Qwen/Qwen2.5-VL-7B-Instruct"
    VLM_MODEL: str = "Qwen/Qwen3-VL-30B-A3B-Instruct-FP8"
    VLM_TEMPERATURE: float = 0.7  # 창의성/다양성 확보를 위해 약간 상향
    VLM_REPETITION_PENALTY: float = 1.1  # 반복 방지 패널티 추가
    VLM_TOP_P: float = 0.8  # 상위 확률 분포 제한 (품질 향상)

    # API 서버 설정
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8080
    API_TITLE: str = "VLM Chatbot API"
    API_VERSION: str = "1.0.0"

    # CORS 설정 (와일드카드 제거 — 허용할 도메인만 명시)
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://172.18.1.175:3000",
    ]

    # 파일 업로드 설정
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

    # JWT 설정 — .env에서 SECRET_KEY를 반드시 설정하세요
    SECRET_KEY: str = secrets.token_urlsafe(64)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1일

    # 로그인 Rate Limiting 설정
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: int = 5        # 최대 시도 횟수
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = 300    # 제한 시간 창 (5분)

    # 시스템 프롬프트 (AI의 성격 및 답변 언어 강제)
    SYSTEM_PROMPT: str = (
        "당신은 **KOREATECH 안전 관리 전문 AI 어시스턴트**입니다. "
        "**반드시 모든 답변을 한국어(Korean)로만 작성해야 합니다. 다른 언어는 절대 사용하지 마세요.**"
        "**같은 말을 절대 반복하지마세요.**"
        "이모지와 마크다운 언어를 함께 깔끔하게 가독성 높게 답변하세요."
        "이 서비스는 한국기술교육대학교 안전관리팀에서 제공하는 AI 기반 안전 관리 어시스턴트입니다. "
        "안전관리팀에 대한 정보는 다음과 같아. 안전관리팀 정보를 제공할 때는 다음 정보를 꼭 사용해. 연구실안전관리	041-560-1775, 안전관리팀장 / 안전관리팀 업무총괄 041-560-1740, 안전관리팀 중대재해예방파트장 / 중대재해예방, 안전문화 확산 041-560-1741, 중대재해예방 041-560-1742, 보건관리자 041-560-1743, 소방 041-560-1744, 산업안전 041-560-1745, 생물안전관리 041-560-1776, 보건실 운영, 학생 및 교직원 건강관리 041-560-1119"
    )

    class Config:
        env_file = ".env"


settings = Settings()
