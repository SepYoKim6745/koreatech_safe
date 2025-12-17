---
name: VLM 챗봇 기능 추가
overview: 마크다운 렌더링 및 이미지 업로드 개선(드래그 앤 드롭, 붙여넣기) 기능을 추가합니다.
todos:
  - id: install-deps
    content: react-markdown, remark-gfm, react-syntax-highlighter 패키지 설치
    status: pending
  - id: markdown-render
    content: ChatInterface.jsx에 마크다운 렌더링 적용
    status: pending
  - id: markdown-css
    content: App.css에 마크다운 스타일 추가
    status: pending
  - id: drag-drop
    content: ChatInterface.jsx에 드래그 앤 드롭 기능 추가
    status: pending
  - id: paste-image
    content: ChatInterface.jsx에 클립보드 붙여넣기 기능 추가
    status: pending
  - id: drag-css
    content: 드래그 오버레이 시각적 피드백 CSS 추가
    status: pending
---

# VLM 챗봇 기능 추가 계획

## 1. 마크다운 렌더링

현재 [ChatInterface.jsx](vlm-chatbot/frontend/src/components/ChatInterface.jsx) 94번 줄에서 `<p>{msg.content}</p>`로 단순 텍스트 출력 중입니다.

**변경 사항:**

- `react-markdown` 라이브러리 설치
- 코드 블록 구문 하이라이팅을 위해 `react-syntax-highlighter` 추가
- 메시지 콘텐츠를 `<ReactMarkdown>` 컴포넌트로 교체
```jsx
// 변경 전
<p>{msg.content}</p>

// 변경 후
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    code({node, inline, className, children, ...props}) {
      // 코드 블록 스타일링
    }
  }}
>
  {msg.content}
</ReactMarkdown>
```


**CSS 추가:**

- [App.css](vlm-chatbot/frontend/src/styles/App.css)에 마크다운 스타일 추가 (헤딩, 리스트, 코드 블록, 테이블 등)

---

## 2. 이미지 업로드 개선

현재 [ImageUpload.jsx](vlm-chatbot/frontend/src/components/ImageUpload.jsx)에서 버튼 클릭으로만 업로드 가능합니다.

**추가할 기능:**

- 드래그 앤 드롭 지원
- 클립보드 붙여넣기 (Ctrl+V) 지원

**구현 방식:**

- [ChatInterface.jsx](vlm-chatbot/frontend/src/components/ChatInterface.jsx)의 입력 영역에 `onDragOver`, `onDrop`, `onPaste` 이벤트 핸들러 추가
- 기존 `ImageUpload.jsx`의 파일 검증 로직 재사용
```jsx
// ChatInterface.jsx에 추가할 핸들러
const handlePaste = (e) => {
  const items = e.clipboardData?.items
  for (let item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      processImageFile(file)
    }
  }
}

const handleDrop = (e) => {
  e.preventDefault()
  const file = e.dataTransfer.files[0]
  if (file?.type.startsWith('image/')) {
    processImageFile(file)
  }
}
```


**CSS 추가:**

- 드래그 중 시각적 피드백 (드래그 오버레이)

---

## 3. 추후 기능 (참고용)

현재 구현 대상은 아니지만 향후 확장을 위한 메모:

- 채팅 히스토리 저장: 백엔드 DB 연동 필요 (SQLite/PostgreSQL)
- 게시판 기능: 새로운 라우팅 및 컴포넌트 필요
- 다중 사용자 지원: 인증 시스템 구현 필요

---

## 파일 변경 요약

| 파일 | 변경 내용 |

|------|----------|

| `package.json` | react-markdown, remark-gfm, react-syntax-highlighter 추가 |

| `ChatInterface.jsx` | 마크다운 렌더링, 드래그/붙여넣기 핸들러 추가 |

| `App.css` | 마크다운 스타일, 드래그 오버레이 스타일 추가 |