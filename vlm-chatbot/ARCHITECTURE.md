# 시스템 및 소프트웨어 구성도

## 시스템 구성도
아래 다이어그램은 로컬/개발 환경을 기준으로 한 전체 구성입니다. vLLM 서버는 OpenAI 호환 API를 노출하며, 프런트엔드 개발 서버(Vite)에서 `/api` 프록시를 통해 FastAPI 백엔드로 요청을 전달합니다.

```mermaid
flowchart LR
    User[사용자 브라우저\n(React UI)] -->|HTTP(S)| FE[프론트엔드\n(Vite Dev Server / 정적 배포)]
    FE -->|Axios /api/*| BE[FastAPI 백엔드\nUvicorn]
    subgraph Backend
        BE -->|/api/chat/message\n/api/chat/upload-image\n/api/chat/health| Router[Chat Router]
        Router --> Service[VLMService\n(OpenAI Client)]
        Service -->|OpenAI 호환 API| VLLM[vLLM 서버\nQwen2.5-VL-7B-Instruct]
    end
    VLLM -->|GPU/CPU\n추론| Model[Qwen2.5-VL 모델]
```

- **네트워크 포트**: 프런트엔드 개발 서버는 기본 `3000`, 백엔드는 `8080`, vLLM 서버는 `8000`(경로 `/v1`).
- **보안/제한**: CORS는 `http://localhost:3000` 및 `http://127.0.0.1:3000`을 허용하도록 기본 설정되어 있습니다. vLLM와의 통신은 API 키가 필요 없도록 `VLM_API_KEY` 기본값이 `EMPTY`로 설정되어 있습니다.

## 소프트웨어 구성도
프런트엔드와 백엔드 각각의 주요 모듈과 데이터 흐름을 나타냅니다.

```mermaid
flowchart TD
    subgraph Frontend [프런트엔드]
        App[App.jsx] --> ChatUI[ChatInterface.jsx]\n(대화 상태/이력 관리)
        ChatUI --> Upload[ImageUpload.jsx]\n(Base64 변환 + 미리보기)
        ChatUI --> Client[api/client.js\n(Axios wrapper)]
    end

    subgraph Backend [백엔드]
        Main[app/main.py\n(FastAPI 앱/CORS 설정)] --> Router[app/api/chat.py\n라우터 & 검증]
        Router --> Models[app/models/__init__.py\nPydantic 모델]
        Router --> Service[app/services/vlm_service.py\nVLMService]
        Service --> Config[app/config.py\n환경 설정 로드]
        Service --> OpenAIClient[openai.OpenAI\n(base_url: VLM_BASE_URL)]
    end

    Client -->|/api/chat/message\n/health\n(upload)| Router
    Upload --> ChatUI
    Router -->|요청/응답 객체| Models
    OpenAIClient --> VLLM[vLLM 서버 /v1/models, /chat/completions]
```

### 데이터 흐름 요약
1. 사용자가 텍스트/이미지를 입력하면 `ChatInterface`가 현재 입력과 대화 이력을 합쳐 백엔드 `/api/chat/message`로 전달합니다.
2. `chat.py` 라우터가 파일 크기/형식과 요청 유효성을 검사하고, `VLMService`에 메시지 빌드를 위임합니다.
3. `VLMService`는 `OpenAI` 클라이언트를 통해 vLLM 서버의 `chat/completions` 엔드포인트를 호출하고, 모델 ID를 `/v1/models`와 동기화합니다.
4. 응답 텍스트가 프런트엔드로 반환되고, UI에서 보낸 메시지와 함께 대화 히스토리로 렌더링됩니다.

### 확장 포인트
- **백엔드**: 데이터베이스 계층을 `app/core`에 추가하여 게시판/로그 기록을 저장하거나, 인증 미들웨어를 추가해 세션/토큰 검증을 수행할 수 있습니다.
- **프런트엔드**: `api/client.js`의 `API_BASE_URL`을 환경 변수(`VITE_API_BASE_URL`)로 외부화하고, 상태 관리 라이브러리(Zustand/Redux)로 전환해 복잡한 UI 상태를 다룰 수 있습니다.
```
