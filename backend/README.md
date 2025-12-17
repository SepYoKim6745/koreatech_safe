# VLM Chatbot Backend

FastAPI 기반 멀티모달 챗봇 백엔드 API

## 기술 스택

- **FastAPI**: 고성능 비동기 웹 프레임워크
- **OpenAI Client**: vLLM 서버와 통신
- **Pydantic**: 데이터 검증 및 설정 관리
- **Uvicorn**: ASGI 서버

## 프로젝트 구조

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 애플리케이션
│   ├── config.py            # 설정 관리
│   ├── api/
│   │   ├── __init__.py
│   │   └── chat.py          # 채팅 API 엔드포인트
│   ├── models/
│   │   └── __init__.py      # Pydantic 모델
│   ├── services/
│   │   ├── __init__.py
│   │   └── vlm_service.py   # VLM 서비스 로직
│   └── core/
│       └── __init__.py
├── requirements.txt
└── .env.example
```

## 설치

### 1. Anaconda 환경 활성화

```bash
# safe_qwen 환경 활성화
conda activate safe_qwen

# 백엔드 디렉토리로 이동
cd backend
```

### 2. 패키지 설치

```bash
pip install -r requirements.txt
```

### 3. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 편집하여 설정 변경
```

## 실행

### 사전 요구사항

vLLM 서버가 실행 중이어야 합니다:

```bash
# Anaconda 환경 활성화
conda activate safe_qwen

# vLLM 서버 실행 (기본)
vllm serve Qwen/Qwen2.5-VL-7B-Instruct --port 8000

# GPU 메모리가 부족한 경우 (Tensor 병렬화)
vllm serve Qwen/Qwen2.5-VL-7B-Instruct --port 8000 --tensor-parallel-size 2
```

### 개발 모드 실행

```bash
# Anaconda 환경 활성화
conda activate safe_qwen

# 프로젝트 루트에서 실행
cd backend
python -m app.main
```

또는:

```bash
conda activate safe_qwen
uvicorn app.main:app --reload --host 127.0.0.1 --port 8080
```

서버가 시작되면 다음 URL에서 접근 가능합니다:
- API: http://127.0.0.1:8080
- Swagger 문서: http://127.0.0.1:8080/docs
- ReDoc 문서: http://127.0.0.1:8080/redoc

## API 엔드포인트

### 1. 채팅 메시지 전송

```http
POST /api/chat/message
Content-Type: application/json

{
  "message": "이 이미지에서 위험요소를 찾아줘",
  "image": "data:image/jpeg;base64,...",
  "history": [
    {
      "role": "user",
      "content": "안녕하세요"
    },
    {
      "role": "assistant",
      "content": "안녕하세요! 무엇을 도와드릴까요?"
    }
  ]
}
```

### 2. 이미지 업로드

```http
POST /api/chat/upload-image
Content-Type: multipart/form-data

file: <image file>
```

### 3. 헬스 체크

```http
GET /api/chat/health
```

## 설정

`config.py` 또는 `.env` 파일에서 설정 변경 가능:

- `VLM_BASE_URL`: vLLM 서버 주소
- `VLM_MODEL`: 사용할 모델 이름
- `VLM_TEMPERATURE`: 응답 생성 온도
- `API_HOST`, `API_PORT`: API 서버 주소
- `CORS_ORIGINS`: CORS 허용 오리진
- `MAX_FILE_SIZE`: 최대 파일 크기
- `ALLOWED_EXTENSIONS`: 허용 파일 확장자

## 확장 가능성

### 데이터베이스 추가

게시판 등의 기능을 위해 데이터베이스 추가:

```bash
pip install sqlalchemy alembic psycopg2-binary
```

`app/core/database.py` 생성:
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/dbname"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```

### 인증 추가

사용자 인증을 위한 JWT 추가:

```bash
pip install python-jose[cryptography] passlib[bcrypt]
```

## 트러블슈팅

### vLLM 연결 실패

```
Error: Connection refused at http://127.0.0.1:8000
```

→ vLLM 서버가 실행 중인지 확인하세요

### CORS 오류

```
Access to XMLHttpRequest has been blocked by CORS policy
```

→ `.env` 파일의 `CORS_ORIGINS`에 프론트엔드 URL 추가

### 포트 충돌

```
Error: Address already in use
```

→ `.env` 파일에서 `API_PORT` 변경
