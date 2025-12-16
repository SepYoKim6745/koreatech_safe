import React from 'react'
import ChatInterface from './components/ChatInterface'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>멀티모달 챗봇 (Qwen2.5-VL)</h1>
        <p>이미지와 텍스트를 함께 입력하여 대화할 수 있습니다</p>
      </header>
      <main className="app-main">
        <ChatInterface />
      </main>
    </div>
  )
}

export default App
