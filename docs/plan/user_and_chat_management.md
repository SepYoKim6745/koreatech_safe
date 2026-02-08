# 👤 사용자 분리 및 채팅방 관리 시스템 구현 계획

이 문서는 기존의 단일 사용자(또는 무기명) 시스템을 **다중 사용자 시스템**으로 전환하고, **사용자별 채팅방(세션) 관리** 기능을 구현하기 위한 구체적인 계획을 담고 있습니다.

---

## 1. 🎯 목표 (Objective)

1.  **사용자 인증 (Authentication)**: 회원가입, 로그인 기능을 통해 사용자를 식별합니다.
2.  **데이터 격리 (Data Isolation)**: 사용자는 자신의 채팅방만 볼 수 있어야 하며, 다른 사람의 채팅방에는 접근할 수 없어야 합니다.
3.  **채팅방 관리 (Session Management)**: 사용자는 자신의 채팅방 목록을 조회, 생성, 삭제할 수 있어야 합니다.

---

## 2. 🗄️ 데이터베이스 스키마 변경 (Database Schema Changes)

### 2.1. Users 테이블 추가 (신규)

사용자 정보를 저장할 테이블이 필요합니다.

| 필드명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | Integer (PK) | 사용자 고유 ID (Auto Increment) |
| `email` | String (Unique) | 로그인 아이디 (이메일) |
| `hashed_password` | String | 암호화된 비밀번호 |
| `username` | String | 사용자 닉네임 (표시용) |
| `is_active` | Boolean | 계정 활성화 여부 |
| `created_at` | DateTime | 가입 일시 |

### 2.2. ChatSession 테이블 수정

기존 채팅방 테이블에 소유자(`user_id`) 정보를 추가합니다.

| 필드명 | 타입 | 변경 사항 |
| :--- | :--- | :--- |
| `user_id` | Integer (FK) | **(추가)** `users.id`를 참조. (Not Null) |

> `ChatMessage` 테이블은 수정할 필요가 없습니다. (Session에 종속적이므로)

---

## 3. 🛠️ 백엔드 구현 계획 (Backend Implementation)

### 3.1. 인증/인가 (Auth) 모듈
- **라이브러리**: `python-jose` (JWT 토큰 생성), `passlib[bcrypt]` (비밀번호 해싱)
- **기능**:
    - `create_access_token`: JWT 액세스 토큰 발급
    - `get_password_hash` / `verify_password`: 비밀번호 보안 처리
    - `get_current_user`: 의존성 주입(Dependency Injection)용 함수. 헤더의 토큰을 검증하여 현재 요청한 사용자 객체를 반환.

### 3.2. API 엔드포인트
- **Authentication Router (`/api/auth`)**
    - `POST /signup`: 회원가입
    - `POST /login`: 로그인 (Access Token 반환)
    - `GET /me`: 내 정보 조회

- **Chat Router (`/api/chat`) 수정**
    - `POST /message`: 메시지 전송 (현재 사용자 ID를 세션 생성/조회 시 사용)
    - `GET /sessions`: **(신규)** 내 채팅방 목록 조회 (DB에서 `user_id`로 필터링)
    - `GET /sessions/{session_id}`: **(신규)** 특정 채팅방의 메시지 내역 조회 (본인 확인 필수)
    - `DELETE /sessions/{session_id}`: **(신규)** 채팅방 삭제 (본인 확인 필수)

---

## 4. 💻 프론트엔드 구현 계획 (Frontend Implementation)

### 4.1. 페이지 (Pages) 구성
- **로그인 페이지 (`/login`)**: 이메일/비밀번호 입력 폼.
- **회원가입 페이지 (`/signup`)**: 계정 생성 폼.
- **메인 채팅 화면 (`/`)**: 로그인한 사용자만 접근 가능. (보호된 라우트)

### 4.2. 상태 관리 (State Management)
- **AuthContext**: 로그인 상태(isLoggedIn), 사용자 정보(user), 토큰(token)을 전역 관리.
- **LocalStorage**: 새로고침 해도 로그인 유지되도록 토큰 저장.

### 4.3. API 클라이언트 수정 (`api/client.js`)
- Axios 요청 시 `Authorization: Bearer <token>` 헤더를 자동으로 포함하도록 인터셉터(Interceptor) 설정.

### 4.4. UI 변경
- **사이드바**:
    - "새 채팅" 버튼
    - **내 채팅방 목록** (백엔드에서 가져와서 표시)
    - 로그아웃 버튼 추가
- **채팅 인터페이스**:
    - 현재 선택된 세션의 대화 내용 표시.

---

## 5. 📝 단계별 진행 순서 (Step-by-Step)

1.  **Backend - 모델링**: `User` 모델 생성 및 `ChatSession` 수정 (Alembic 또는 재생성).
2.  **Backend - Auth**: JWT 설정, 해싱 유틸리티, 의존성 함수 구현.
3.  **Backend - API**: 회원가입/로그인 구현, 채팅 API에 사용자 인증 적용.
4.  **Frontend - Auth UI**: 로그인/회원가입 페이지 및 라우팅 처리.
5.  **Frontend - 연동**: 로그인 연동 및 토큰 저장 로직 구현.
6.  **Frontend - Chat UI**: 사이드바에 채팅 목록 연동, 채팅방 전환 기능 구현.

---
이 문서를 바탕으로 프롬프트를 작성하여 개발을 진행하면 됩니다.
