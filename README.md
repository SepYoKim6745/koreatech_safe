# 🤖 VLM Safety Chatbot

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
</p>

> **Qwen3-VL 기반 멀티모달 안전 관리 어시스턴트**
>
> 이미지를 실시간으로 분석하고 안전 위험 요소를 파악하는 지능형 AI 챗봇 시스템입니다.

---

## ✨ Key Features

- 🖼️ **Multimodal Analysis**: 이미지 업로드 및 실시간 객체 인식을 통한 안전 진단.
- 📄 **Document Summarization**: 대용량 PDF 문서 텍스트 추출 및 요약 기능.
- ⚡ **Real-time Streaming**: 답변 생성 과정을 실시간으로 확인할 수 있는 스트리밍 인터페이스.
- 🔐 **Multi-user Support**: JWT 기반의 보안 인증 및 사용자별 독립적인 대화 세션 관리.
- 🚀 **High Performance**: 
  - vLLM 기반의 고속 추론 서버 연동.
  - 비동기 아키텍처 및 SQLite WAL 모드 적용으로 동시성 극대화.
  - 프론트엔드 렌더링 최적화(Throttling)로 부드러운 UX 제공.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18, Vite
- **Styling**: Modern CSS (Apple-style Design)
- **Libraries**: React Markdown, Syntax Highlighter, Axios

### Backend
- **Framework**: FastAPI (Asynchronous Python)
- **Database**: SQLite (SQLAlchemy ORM)
- **Auth**: JWT (python-jose), Passlib (bcrypt)
- **AI Integration**: OpenAI SDK (AsyncOpenAI)

### Model Server
- **Engine**: vLLM
- **Model**: Qwen3-VL-8B-Instruct

---

## 🚀 Quick Start

한 번의 스크립트 실행으로 모든 마이크로서비스(vLLM, Backend, Frontend)를 기동할 수 있습니다.

### 1. Prerequisite
- NVIDIA GPU (CUDA 지원)
- Anaconda / Miniconda
- Node.js (v16+)

### 2. Execution
```bash
# 전체 서비스 시작
./start_all.sh start

# 서비스 상태 확인
./start_all.sh status

# 특정 서비스 로그 확인
./start_all.sh logs backend
```

### 3. Access
- **Web UI**: `http://localhost:3000`
- **API Docs**: `http://localhost:8080/docs`

---

## 📂 Architecture

```text
koreatech_safe/
├── backend/            # FastAPI 비동기 백엔드 서버
│   ├── app/api/        # 채팅 및 인증 라우터
│   ├── app/models/     # DB 스키마 (Chat, User)
│   └── app/services/   # VLM 연동 및 PDF 처리 서비스
├── frontend/           # React + Vite 프론트엔드
│   ├── src/components/ # 최적화된 스트리밍 UI 컴포넌트
│   └── src/api/        # AbortController가 적용된 API 클라이언트
├── docs/               # 시스템 설계 및 아키텍처 문서
└── start_all.sh        # 자동화된 통합 실행 스크립트
```

---

## 📋 Update History

시스템의 지속적인 개선 사항은 [Update Log](./docs/update_log)에서 확인할 수 있습니다.

- **2026-02-08**: 추론 성능 최적화, DB 동시성 개선, 스트리밍 안정성 강화 및 UI 레이아웃 업데이트 완료.

---

## 📄 License

This project is licensed under the MIT License.
