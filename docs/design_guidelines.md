# 🎨 UI/UX 디자인 가이드라인 (Design Guidelines)

이 문서는 프로젝트의 일관된 디자인(Look & Feel)을 유지하기 위한 스타일 가이드입니다.  
**Apple 스타일의 모던하고 미니멀한 디자인**을 지향합니다.

---

## 1. 🌈 컬러 팔레트 (Color Palette)

브랜드 아이덴티티를 나타내는 핵심 색상입니다. `App.css`의 `:root` 변수로 정의되어 있습니다.

| 색상명 | 변수명 | Hex Code | 사용 용도 |
| :--- | :--- | :--- | :--- |
| **Orange (Main)** | `--color-orange` | `#FF7F00` | 전송 버튼, 강조 요소, 인용문 바 |
| **Blue (Sub)** | `--color-blue` | `#183072` | 사용자 말풍선, 활성 채팅, 헤더 텍스트 |
| **Light Blue** | `--color-light-blue` | `#22449C` | 입력창 포커스 테두리, 호버 효과 |
| **Background** | `--bg-app` | `#FFFFFF` | 메인 배경, 헤더 배경 |
| **Sidebar** | `--bg-sidebar` | `#F5F5F7` | 사이드바 배경, 보조 버튼 배경 |
| **Gray** | `--color-gray` | `#4C4C4C` | 본문 텍스트 (보조) |
| **Light Gray** | `--color-light-gray` | `#B3B3AA` | 비활성화 버튼, 테두리 |

> **💡 사용 팁**: 새로운 요소를 추가할 때는 직접 색상 코드를 쓰지 말고 `var(--color-orange)`와 같이 변수를 사용하세요.

---

## 2. 🔤 타이포그래피 (Typography)

가독성을 최우선으로 하는 깔끔한 고딕(Sans-serif) 서체를 사용합니다.

- **Font Family**: `-apple-system`, `BlinkMacSystemFont`, `"Pretendard"`, `"Apple SD Gothic Neo"`, `sans-serif`
- **본문 크기**: `15px` ~ `16px`
- **줄 간격 (Line Height)**: `1.6` ~ `1.7` (여유로운 호흡)
- **답변 텍스트 색상**: `#000000` (완전한 검정색으로 가독성 확보)

---

## 3. 📐 레이아웃 & 간격 (Layout & Spacing)

- **헤더 높이**: `64px` (사이드바 상단과 메인 헤더 높이 통일)
- **모서리 둥글기 (Border Radius)**:
    - 버튼, 카드: `12px` (`--radius-md`)
    - 사용자 말풍선: `20px` (왼쪽 하단만 각지게)
    - 입력창: `24px` (알약 모양 Pill-shape)
- **여백 (Margin/Padding)**:
    - 메시지 사이 간격: `24px`
    - 내부 패딩: 넉넉하게 주어 답답하지 않게 함

---

## 4. ✨ UI 컴포넌트 스타일 (Component Styles)

### 💬 말풍선 (Chat Bubble)
- **사용자**: 브랜드 블루(`--color-blue`) 배경 + 흰색 글씨 + 둥근 모서리 + 그림자
- **AI (Assistant)**: **투명 배경** + 검정 글씨 + 화면 너비 사용 (문서 스타일)

### 🔘 버튼 (Buttons)
- **전송 버튼**: 오렌지 원형 버튼 + 화살표 아이콘 + 호버 시 확대 효과
- **일반 버튼**: 텍스트 위주 or 아이콘 + 투명 배경 + 호버 시 연한 회색 배경

### 🖼️ 모달 (Modal)
- **스타일**: Apple iOS 스타일
- **배경**: 반투명 블러 (`backdrop-filter: blur(4px)`)
- **애니메이션**: 부드럽게 확대되며 등장 (`scaleIn`)

---

## 5. 📝 마크다운 (Markdown) 스타일

AI 답변의 가독성을 위한 스타일입니다.

- **표 (Table)**: 테두리 있음, 헤더 배경색(`#F5F5F7`), 셀 간격 여유로움
- **코드 블록**: `react-syntax-highlighter` 적용 (VS Code Dark 테마), 둥근 모서리
- **인용문**: 왼쪽에 오렌지색 바 + 연한 오렌지 배경

---

## 🚀 개발 시 주의사항

1. **CSS 변수 활용**: 색상 변경 시 `App.css`의 `:root`만 수정하면 전체 테마가 바뀝니다.
2. **반응형 고려**: 모바일에서는 사이드바가 숨겨지고, 햄버거 메뉴 대신 로고 클릭으로 열립니다.
3. **일관성 유지**: 새로운 버튼을 만들 때 기존 버튼 클래스(`.modal-btn`, `.upload-button` 등)를 참고하여 스타일을 통일하세요.
