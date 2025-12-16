# VLM Chatbot

Qwen2.5-VL 기반 멀티모달 챗봇 - 프론트엔드/백엔드 분리 구조

## 프로젝트 개요

이미지와 텍스트를 동시에 처리할 수 있는 비전-언어 모델(VLM) 기반 챗봇입니다.
유지보수가 용이한 프론트엔드/백엔드 분리 구조로 설계되어, 추후 게시판 등의 기능을 쉽게 추가할 수 있습니다.

## 기술 스택

### 백엔드
- **FastAPI**: 고성능 비동기 웹 프레임워크
- **OpenAI Client**: vLLM 서버 연동
- **Pydantic**: 데이터 검증 및 설정 관리
- **Uvicorn**: ASGI 서버

### 프론트엔드
- **React 18**: UI 라이브러리
- **Vite**: 빌드 도구
- **Axios**: HTTP 클라이언트

### AI 모델
- **Qwen2.5-VL-7B**: Alibaba의 멀티모달 언어 모델
- **vLLM**: 고성능 LLM 추론 엔진

## 프로젝트 구조

```
vlm-chatbot/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py         # FastAPI 애플리케이션
│   │   ├── config.py       # 설정 관리
│   │   ├── api/            # API 엔드포인트
│   │   ├── models/         # 데이터 모델
│   │   ├── services/       # 비즈니스 로직
│   │   └── core/           # 핵심 유틸리티
│   ├── requirements.txt
│   └── README.md
│
├── frontend/               # React 프론트엔드
│   ├── src/
│   │   ├── components/    # React 컴포넌트
│   │   ├── api/           # API 클라이언트
│   │   ├── styles/        # CSS 스타일
│   │   └── App.jsx
│   ├── package.json
│   └── README.md
│
├── .gitignore
└── README.md
```

## 빠른 시작

### 사전 요구사항

1. **Anaconda** 설치
2. **Conda 환경 `safe_qwen`** 활성화
3. **Node.js 16+** 설치
4. **GPU 환경** (CUDA 지원)

### 1. vLLM 서버 실행

```bash
# 아나콘다 환경 활성화
conda activate safe_qwen

# vLLM 설치 (아직 설치하지 않은 경우)
pip install vllm

# Qwen2.5-VL 모델로 vLLM 서버 시작 (기본)
vllm serve Qwen/Qwen2.5-VL-7B-Instruct --port 8000

# GPU 메모리가 부족한 경우: Tensor 병렬화 사용 (2개 GPU)
vllm serve Qwen/Qwen2.5-VL-7B-Instruct --port 8000 --tensor-parallel-size 2

# GPU 메모리가 부족한 경우: 4개 GPU로 분산
vllm serve Qwen/Qwen2.5-VL-7B-Instruct --port 8000 --tensor-parallel-size 4

# 추가 메모리 최적화 옵션 (권장)
vllm serve Qwen/Qwen2.5-VL-7B-Instruct \
  --port 8000 \
  --tensor-parallel-size 2 \
  --gpu-memory-utilization 0.9 \
  --max-model-len 4096
```

**vLLM 서버 옵션 설명:**
- `--tensor-parallel-size N`: 모델을 N개의 GPU에 분산 (메모리 부족 시 필수)
- `--gpu-memory-utilization 0.9`: GPU 메모리 사용률 (기본 0.9 = 90%)
- `--max-model-len`: 최대 시퀀스 길이 제한 (메모리 절약)
- `--dtype auto`: 자동 데이터 타입 선택 (fp16, bfloat16 등)

### 2. 백엔드 실행

```bash
# 아나콘다 환경 활성화
conda activate safe_qwen

# 백엔드 디렉토리로 이동
cd vlm-chatbot/backend

# 패키지 설치
pip install -r requirements.txt

# 환경 변수 설정 (선택사항)
cp .env.example .env

# 서버 실행
python -m app.main
```

백엔드 서버가 http://127.0.0.1:8080에서 실행됩니다.

### 3. 프론트엔드 실행

새 터미널에서:

```bash
# 프론트엔드 디렉토리로 이동
cd vlm-chatbot/frontend

# 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드가 http://localhost:3000에서 실행됩니다.

## 사용 방법

1. 브라우저에서 http://localhost:3000 접속
2. "📷 이미지 업로드" 버튼을 클릭하여 이미지 선택
3. 메시지 입력란에 질문 입력 (예: "이 이미지에서 위험요소를 찾아줘")
4. "보내기" 버튼 클릭 또는 Enter 키 입력
5. AI의 응답 확인

## API 문서

백엔드 서버 실행 후 다음 URL에서 API 문서 확인:

- **Swagger UI**: http://127.0.0.1:8080/docs
- **ReDoc**: http://127.0.0.1:8080/redoc

## 주요 기능

### 현재 구현된 기능

- ✅ 멀티모달 채팅 (이미지 + 텍스트)
- ✅ 대화 히스토리 관리
- ✅ 이미지 업로드 및 미리보기
- ✅ 반응형 UI
- ✅ 실시간 메시지 전송
- ✅ 로딩 상태 표시

### 확장 가능한 기능 (추후 구현)

- 🔲 사용자 인증 및 권한 관리
- 🔲 게시판 기능
- 🔲 채팅 히스토리 저장 (데이터베이스)
- 🔲 파일 관리 시스템
- 🔲 관리자 대시보드
- 🔲 다중 사용자 지원
- 🔲 WebSocket 기반 실시간 채팅

## 개발 가이드

### 백엔드 확장

게시판 API 추가 예시:

```bash
cd backend/app/api
# board.py 생성
```

```python
# app/api/board.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/board", tags=["board"])

@router.get("/posts")
async def get_posts():
    return {"posts": []}
```

`app/main.py`에 라우터 추가:

```python
from app.api import chat, board

app.include_router(chat.router)
app.include_router(board.router)
```

### 프론트엔드 확장

새 페이지 추가를 위한 라우팅:

```bash
cd frontend
npm install react-router-dom
```

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatInterface from './components/ChatInterface'
import Board from './components/Board'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatInterface />} />
        <Route path="/board" element={<Board />} />
      </Routes>
    </BrowserRouter>
  )
}
```

## 설정

### 백엔드 설정

`backend/.env` 파일에서 설정:

```env
VLM_BASE_URL=http://127.0.0.1:8000/v1
VLM_MODEL=qwen2.5-vl-7b
API_PORT=8080
```

### 프론트엔드 설정

`frontend/vite.config.js`에서 프록시 설정:

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8080'
    }
  }
})
```

## 배포

### 프로덕션 빌드

```bash
# 프론트엔드 빌드
cd frontend
npm run build

# 빌드된 파일은 frontend/dist/에 생성됨
```

### Docker 배포 (선택사항)

추후 Docker Compose를 사용한 배포 지원 예정

## 트러블슈팅

### vLLM 서버 연결 실패

```
Error: Connection refused
```

→ vLLM 서버가 http://127.0.0.1:8000에서 실행 중인지 확인

### 백엔드 실행 오류

```
ModuleNotFoundError: No module named 'fastapi'
```

→ 아나콘다 환경 활성화 및 패키지 재설치:
```bash
conda activate safe_qwen
pip install -r requirements.txt
```

### 프론트엔드 빌드 오류

```
npm ERR! code ELIFECYCLE
```

→ node_modules 재설치:
```bash
rm -rf node_modules package-lock.json
npm install
```

### CORS 오류

```
Access to XMLHttpRequest has been blocked by CORS policy
```

→ 백엔드 `.env`의 `CORS_ORIGINS`에 프론트엔드 URL 추가

### GPU 메모리 부족 (OOM)

```
torch.cuda.OutOfMemoryError: CUDA out of memory
```

**해결 방법:**

1. **Tensor 병렬화 사용** (가장 효과적)
   ```bash
   # GPU 2개 사용
   vllm serve Qwen/Qwen2.5-VL-7B-Instruct --port 8000 --tensor-parallel-size 2
   ```

2. **GPU 메모리 사용률 조정**
   ```bash
   vllm serve Qwen/Qwen2.5-VL-7B-Instruct --port 8000 --gpu-memory-utilization 0.8
   ```

3. **최대 시퀀스 길이 제한**
   ```bash
   vllm serve Qwen/Qwen2.5-VL-7B-Instruct --port 8000 --max-model-len 2048
   ```

4. **사용 가능한 GPU 확인**
   ```bash
   nvidia-smi
   # 또는
   python -c "import torch; print(f'GPU 개수: {torch.cuda.device_count()}')"
   ```

5. **권장 설정 (GPU 메모리 부족 시)**
   ```bash
   vllm serve Qwen/Qwen2.5-VL-7B-Instruct \
     --port 8000 \
     --tensor-parallel-size 2 \
     --gpu-memory-utilization 0.85 \
     --max-model-len 4096 \
     --dtype half
   ```

## 라이선스

MIT

## 기여

이슈 및 풀 리퀘스트를 환영합니다!

## 참고

- [FastAPI 문서](https://fastapi.tiangolo.com/)
- [React 문서](https://react.dev/)
- [Qwen2.5-VL 모델](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct)
- [vLLM 문서](https://docs.vllm.ai/)
