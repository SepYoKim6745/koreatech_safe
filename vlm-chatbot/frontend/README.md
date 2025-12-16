# VLM Chatbot Frontend

React + Vite 기반 멀티모달 챗봇 프론트엔드

## 기술 스택

- **React 18**: UI 라이브러리
- **Vite**: 빌드 도구 및 개발 서버
- **Axios**: HTTP 클라이언트
- **CSS3**: 스타일링

## 프로젝트 구조

```
frontend/
├── src/
│   ├── components/
│   │   ├── ChatInterface.jsx    # 채팅 인터페이스
│   │   └── ImageUpload.jsx      # 이미지 업로드
│   ├── api/
│   │   └── client.js            # API 클라이언트
│   ├── styles/
│   │   └── App.css              # 스타일
│   ├── App.jsx                  # 메인 앱
│   └── main.jsx                 # 엔트리 포인트
├── public/
├── index.html
├── vite.config.js
└── package.json
```

## 설치

### 패키지 설치

```bash
cd frontend
npm install
```

## 실행

### 개발 모드

```bash
npm run dev
```

개발 서버가 시작되면 http://localhost:3000에서 접근 가능합니다.

### 프로덕션 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 폴더에 생성됩니다.

### 프로덕션 미리보기

```bash
npm run preview
```

## 주요 기능

### 1. 채팅 인터페이스

- 실시간 메시지 전송 및 수신
- 대화 히스토리 관리
- 자동 스크롤
- 로딩 상태 표시

### 2. 이미지 업로드

- 드래그 앤 드롭 지원
- 이미지 미리보기
- 파일 크기 및 형식 검증 (10MB, jpg/png/gif/webp)
- Base64 인코딩

### 3. UI/UX

- 반응형 디자인
- 그라디언트 테마
- 부드러운 애니메이션
- 키보드 단축키 (Enter: 전송, Shift+Enter: 줄바꿈)

## API 연동

백엔드 API 주소는 `vite.config.js`에서 프록시 설정:

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      }
    }
  }
})
```

API 클라이언트는 `src/api/client.js`에서 관리:

```javascript
const API_BASE_URL = 'http://127.0.0.1:8080'
```

## 컴포넌트 설명

### ChatInterface.jsx

채팅 인터페이스의 메인 컴포넌트:

- 메시지 상태 관리
- API 호출 및 응답 처리
- 대화 히스토리 관리
- 로딩 상태 처리

### ImageUpload.jsx

이미지 업로드 컴포넌트:

- 파일 선택 및 검증
- Base64 인코딩
- 미리보기 표시
- 이미지 제거

## 스타일 커스터마이징

`src/styles/App.css`에서 스타일 수정:

```css
/* 테마 색상 변경 */
.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 메시지 버블 색상 */
.message.user .message-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

## 확장 가능성

### 라우팅 추가

게시판 등 추가 페이지를 위한 라우팅:

```bash
npm install react-router-dom
```

### 상태 관리

복잡한 상태 관리를 위한 Redux/Zustand:

```bash
npm install zustand
# 또는
npm install @reduxjs/toolkit react-redux
```

### UI 라이브러리

더 풍부한 UI를 위한 컴포넌트 라이브러리:

```bash
npm install @mui/material @emotion/react @emotion/styled
# 또는
npm install antd
```

## 환경 변수

`.env` 파일을 생성하여 환경 변수 설정:

```env
VITE_API_BASE_URL=http://127.0.0.1:8080
```

사용:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
```

## 트러블슈팅

### API 연결 실패

```
Network Error
```

→ 백엔드 서버가 실행 중인지 확인하세요

### CORS 오류

→ 백엔드의 CORS 설정에 프론트엔드 URL이 포함되어 있는지 확인

### 빌드 오류

```
npm ERR! code ELIFECYCLE
```

→ `node_modules` 삭제 후 재설치:
```bash
rm -rf node_modules package-lock.json
npm install
```
