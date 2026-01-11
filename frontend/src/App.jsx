import React, { useState } from 'react'
import ChatInterface from './components/ChatInterface'
import Sidebar from './components/Sidebar'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState(null); // 현재 선택된 채팅방 ID

  const handleNewChat = () => {
    setCurrentSessionId(null); // 새 채팅 모드
    // 모바일에서는 새 채팅 누르면 사이드바 닫기 (선택사항)
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  }

  const handleSelectChat = (sessionId) => {
    setCurrentSessionId(sessionId);
    // 모바일에서는 채팅 선택 시 사이드바 닫기
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  }

  return (
    <div className="app">
      <Sidebar 
        onNewChat={handleNewChat} 
        onSelectChat={handleSelectChat}
        currentSessionId={currentSessionId}
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />
      <div className="main-content">
        <header className="app-header">
          {!isSidebarOpen && (
            <button className="menu-button" onClick={toggleSidebar} aria-label="메뉴 열기">
              ☰
            </button>
          )}
          <div className="header-title">
            <h1>멀티모달 챗봇 (Qwen2.5-VL)</h1>
            <p>이미지와 텍스트를 함께 입력하여 대화할 수 있습니다</p>
          </div>
        </header>
        <main className="app-main">
          <ChatInterface 
            sessionId={currentSessionId} 
            onSessionCreated={(id) => setCurrentSessionId(id)}
          />
        </main>
      </div>
    </div>
  )
}

export default App
