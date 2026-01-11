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
          <div 
            className="header-branding" 
            onClick={toggleSidebar} 
            style={{cursor: 'pointer'}}
            title={isSidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
          >
            <img 
                src="/assets/kut_logo.gif" 
                onError={(e) => {e.target.src = 'https://placehold.co/140x40/FF7F00/ffffff?text=SafeChat';}} 
                alt="SafeChat AI" 
                className="header-logo" 
            />
            <span className="header-divider">|</span>
            <span className="header-subtitle">Safety Management Assistant</span>
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
