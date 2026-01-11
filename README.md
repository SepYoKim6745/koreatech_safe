# 🤖 VLM Chatbot (이미지 인식 AI 챗봇)

이 프로젝트는 **이미지를 보고 질문에 대답할 수 있는 인공지능 챗봇**입니다.  
최신 **Qwen3-VL** 모델을 사용하여 텍스트뿐만 아니라 이미지에 대한 이해 능력을 갖추고 있습니다.

## ✨ 주요 기능

- **이미지 업로드 & 분석**: 사진을 올리고 "이 사진에 위험한 요소가 있어?"라고 물어보세요.
- **실시간 채팅**: AI와 자연스러운 대화가 가능합니다.
- **대화 기록**: 이전 대화 내용이 저장되어 흐름이 끊기지 않습니다.

---

## 🚀 1분 만에 시작하기 (권장)

복잡한 명령어 없이 스크립트 하나로 모든 서비스를 실행할 수 있습니다.

### 1. 필수 프로그램 설치
시작하기 전에 아래 프로그램들이 설치되어 있어야 합니다.
- **Anaconda (또는 Miniconda)**: 파이썬 환경 관리
- **Node.js (16 버전 이상)**: 프론트엔드 실행
- **NVIDIA GPU 드라이버**: AI 모델 가속용

### 2. 전체 서비스 실행
터미널에서 아래 명령어를 입력하세요.

```bash
# 실행 스크립트에 권한 부여
chmod +x start_all.sh

# 전체 서비스 시작
./start_all.sh start
```

이 스크립트는 다음 3가지를 순서대로 켜줍니다:
1. **vLLM 서버**: AI 모델을 로드합니다. (가장 오래 걸림)
2. **Backend**: 채팅 API 서버를 켭니다.
3. **Frontend**: 웹 화면을 켭니다.

### 3. 접속하기
실행이 완료되면 브라우저를 열고 아래 주소로 접속하세요.  
👉 **http://localhost:3000**

---

## 🛠️ 수동으로 설치 및 실행하기 (상세 가이드)

자동 스크립트가 작동하지 않거나, 개발 목적으로 따로 실행하고 싶다면 아래 순서를 따라주세요.

### 1단계: 환경 설정 (Anaconda)
먼저 파이썬 가상환경을 만들고 필요한 라이브러리를 설치합니다.

```bash
# 가상환경 생성 및 활성화
conda create -n safety_management python=3.10
conda activate safety_management

# vLLM 및 백엔드 패키지 설치
pip install vllm
pip install -r backend/requirements.txt
```

### 2단계: vLLM 서버 (AI 두뇌) 실행
AI 모델을 메모리에 올리고 대기시키는 서버입니다. **8000번 포트**를 사용합니다.

```bash
# Qwen3-VL 모델 실행
vllm serve Qwen/Qwen3-VL-8B-Instruct --port 8000 --tensor-parallel-size 1 --gpu-memory-utilization 0.9 --max-model-len 4096
```
*(참고: GPU 메모리가 부족하면 `--tensor-parallel-size`를 늘리거나 `--gpu-memory-utilization`을 줄여보세요.)*

### 3단계: 백엔드 서버 (API) 실행
웹 화면과 AI 서버를 연결해주는 다리 역할을 합니다. **8080번 포트**를 사용합니다.

```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
```

### 4단계: 프론트엔드 (웹 화면) 실행
사용자가 볼 수 있는 채팅 화면입니다. **3000번 포트**를 사용합니다.

```bash
cd frontend
npm install  # 처음 한 번만 실행
npm run dev
```

---

## 📂 프로젝트 구조 (어디에 뭐가 있나요?)

```
koreatech_safe/
├── backend/            # 🐍 백엔드 (Python/FastAPI)
│   ├── app/main.py     # 서버 실행 파일
│   ├── app/api/        # 채팅 기능 코드
│   └── app/config.py   # 설정 파일 (포트, 모델명 등)
│
├── frontend/           # ⚛️ 프론트엔드 (React)
│   ├── src/components/ # 채팅창, 업로드 버튼 등 화면 구성요소
│   └── src/api/        # 백엔드와 통신하는 코드
│
├── logs/               # 📝 실행 로그가 저장되는 곳 (에러 확인용)
└── start_all.sh        # ⚡ 전체 자동 실행 스크립트
```

---

## ❓ 자주 묻는 질문 (Troubleshooting)

### Q. 실행했는데 에러가 나요!
`logs/` 폴더 안의 파일들을 확인해보세요.
- `vllm.log`: AI 모델 관련 에러
- `backend.log`: API 서버 에러
- `frontend.log`: 웹 화면 에러

### Q. "Address already in use" 에러가 떠요.
이미 해당 포트(8000, 8080, 3000)를 다른 프로그램이 쓰고 있는 것입니다.
`./start_all.sh stop` 명령어로 기존 프로세스를 종료하거나, 컴퓨터를 재부팅 해보세요.

### Q. 모델이 너무 느려요 / GPU 메모리 에러(OOM)가 나요.
GPU 사양이 부족할 수 있습니다. `start_all.sh` 파일을 열어서 `gpu-memory-utilization` 값을 0.8 정도로 낮춰보세요.

---
**개발자 정보**
- Backend: FastAPI, Python
- Frontend: React, Vite
- AI Model: Qwen3-VL-8B-Instruct